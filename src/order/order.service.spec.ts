import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Prisma } from '../generated/prisma/client';
import { OrderPlacedEvent } from './events/order-placed.event';
import { type OrderRow, type ProductStockRow } from './repositories/order.repository';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let eventEmitter: { emit: jest.Mock };
  let repository: any;

  const tx = {} as Prisma.TransactionClient;

  beforeEach(() => {
    repository = {
      withTransaction: jest.fn(),
      lockProductsForUpdate: jest.fn(),
      findActiveProductsByIds: jest.fn(),
      decrementProductStock: jest.fn(),
      createOrder: jest.fn(),
      findOrdersAndCount: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    service = new OrderService(
      repository,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  it('creates order, decrements stock, and emits order placed event', async () => {
    const product: ProductStockRow = {
      id: 'ef8b9b50-4633-4fef-bcc7-c8ded8151379',
      price: new Prisma.Decimal(25),
      stockQuantity: 10,
    };

    const createdOrder: OrderRow = {
      id: 'f8978d2e-a2fe-4f2c-96f1-d7b6f6264f58',
      userId: 1,
      status: 'pending',
      totalAmount: new Prisma.Decimal(50),
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
      updatedAt: new Date('2026-05-25T10:00:00.000Z'),
      items: [
        {
          id: 'd8e9fbd0-7f8a-4f32-be67-c0f2f36f9bc2',
          orderId: 'f8978d2e-a2fe-4f2c-96f1-d7b6f6264f58',
          productId: product.id,
          quantity: 2,
          priceAtPurchase: new Prisma.Decimal(25),
        },
      ],
    };

    repository.withTransaction.mockImplementation(
      async (callback: (trx: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(tx),
    );
    repository.lockProductsForUpdate.mockResolvedValue(undefined);
    repository.findActiveProductsByIds.mockResolvedValue([{ ...product }]);
    repository.decrementProductStock.mockResolvedValue(undefined);
    repository.createOrder.mockResolvedValue(createdOrder);

    const result = await service.createOrder(1, {
      items: [{ productId: product.id, quantity: 2 }],
    });

    expect(repository.lockProductsForUpdate).toHaveBeenCalledWith(tx, [product.id]);
    expect(repository.findActiveProductsByIds).toHaveBeenCalledWith(tx, [product.id]);
    expect(repository.decrementProductStock).toHaveBeenCalledWith(tx, product.id, 2);
    expect(repository.createOrder).toHaveBeenCalledTimes(1);
    expect(result.totalAmount).toBe(50);
    expect(result.items[0].priceAtPurchase).toBe(25);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      OrderPlacedEvent.eventName,
      expect.objectContaining({
        orderId: createdOrder.id,
        userId: 1,
      }),
    );
  });

  it('throws conflict when stock is insufficient', async () => {
    repository.withTransaction.mockImplementation(
      async (callback: (trx: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(tx),
    );
    repository.lockProductsForUpdate.mockResolvedValue(undefined);
    repository.findActiveProductsByIds.mockResolvedValue([
      {
        id: 'a96dc5ef-908a-4404-b453-fad5d2e7ecf8',
        price: new Prisma.Decimal(15),
        stockQuantity: 1,
      } satisfies ProductStockRow,
    ]);

    await expect(
      service.createOrder(1, {
        items: [{ productId: 'a96dc5ef-908a-4404-b453-fad5d2e7ecf8', quantity: 2 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.decrementProductStock).not.toHaveBeenCalled();
    expect(repository.createOrder).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('throws not found when one or more products are missing', async () => {
    repository.withTransaction.mockImplementation(
      async (callback: (trx: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(tx),
    );
    repository.lockProductsForUpdate.mockResolvedValue(undefined);
    repository.findActiveProductsByIds.mockResolvedValue([
      {
        id: 'bd3f4256-b962-4462-944a-dff7ea223bd9',
        price: new Prisma.Decimal(20),
        stockQuantity: 10,
      } satisfies ProductStockRow,
    ]);

    await expect(
      service.createOrder(1, {
        items: [
          { productId: 'bd3f4256-b962-4462-944a-dff7ea223bd9', quantity: 1 },
          { productId: 'f2cc0b7b-890b-4ca6-91c3-e2f29542b29f', quantity: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.decrementProductStock).not.toHaveBeenCalled();
    expect(repository.createOrder).not.toHaveBeenCalled();
  });

  it('lists orders and returns calculated pagination metadata', async () => {
    repository.findOrdersAndCount.mockResolvedValue([
      [
        {
          id: 'f4315b98-15d6-4f4f-a6b5-f1d3f74cc1db',
          userId: 5,
          status: 'pending',
          totalAmount: new Prisma.Decimal('120.5'),
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
          items: [
            {
              id: 'a16f42d0-95b8-4c71-8c90-c5c743543236',
              orderId: 'f4315b98-15d6-4f4f-a6b5-f1d3f74cc1db',
              productId: '72432907-4731-42c6-b274-f9d4d6f96ef6',
              quantity: 1,
              priceAtPurchase: new Prisma.Decimal('120.5'),
            },
          ],
        } satisfies OrderRow,
      ],
      7,
    ]);

    const result = await service.listOrders(5, {
      page: 2,
      limit: 3,
      minTotalAmount: 100,
      startDate: '2026-05-01T00:00:00.000Z',
      endDate: '2026-05-31T23:59:59.999Z',
    });

    expect(repository.findOrdersAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 5,
        totalAmount: { gte: new Prisma.Decimal(100) },
      }),
      3,
      3,
    );
    expect(result.meta).toEqual({
      page: 2,
      limit: 3,
      totalItems: 7,
      totalPages: 3,
    });
    expect(result.data[0].totalAmount).toBe(120.5);
  });

  it('rejects list queries where startDate is after endDate', async () => {
    await expect(
      service.listOrders(5, {
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-05-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.findOrdersAndCount).not.toHaveBeenCalled();
  });
});