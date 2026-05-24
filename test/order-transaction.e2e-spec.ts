import 'dotenv/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../src/generated/prisma/client';
import { OrderRepository } from '../src/order/repositories/order.repository';
import { OrderService } from '../src/order/order.service';
import { PrismaService } from '../src/prisma/prisma.service';

const describeIfDatabaseConfigured = process.env.DATABASE_URL
  ? describe
  : describe.skip;

describeIfDatabaseConfigured('OrderService Transaction Flow (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let service: OrderService;

  const createdUserIds: number[] = [];
  const createdProductIds: string[] = [];

  const createUniqueSuffix = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;

  const createUser = async () => {
    const suffix = createUniqueSuffix();
    const user = await prisma.user.create({
      data: {
        email: `order-int-${suffix}@example.com`,
        name: 'Order Integration User',
        password: `hash-${suffix}`,
      },
      select: { id: true },
    });

    createdUserIds.push(user.id);
    return user;
  };

  const createProduct = async (stockQuantity: number, price: number) => {
    const suffix = createUniqueSuffix();
    const sku = `ORDINT${suffix}`.slice(0, 64);

    const product = await prisma.product.create({
      data: {
        sku,
        name: `Order Integration Product ${suffix}`,
        price: new Prisma.Decimal(price),
        stockQuantity,
      },
      select: { id: true },
    });

    createdProductIds.push(product.id);
    return product;
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        PrismaService,
        OrderRepository,
        OrderService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(OrderService);
    await prisma.$connect();
  });

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      await prisma.orderItem.deleteMany({
        where: {
          order: {
            userId: {
              in: createdUserIds,
            },
          },
        },
      });

      await prisma.order.deleteMany({
        where: {
          userId: {
            in: createdUserIds,
          },
        },
      });
    }

    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({
        where: {
          id: {
            in: createdProductIds,
          },
        },
      });
    }

    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
    }

    createdUserIds.length = 0;
    createdProductIds.length = 0;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await moduleRef?.close();
  });

  it('commits order and decrements stock in a single transaction', async () => {
    const user = await createUser();
    const product = await createProduct(10, 25);

    const result = await service.createOrder(user.id, {
      items: [{ productId: product.id, quantity: 2 }],
    });

    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stockQuantity: true },
    });

    const persistedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: result.id },
      include: { items: true },
    });

    expect(updatedProduct.stockQuantity).toBe(8);
    expect(persistedOrder.userId).toBe(user.id);
    expect(persistedOrder.items).toHaveLength(1);
    expect(persistedOrder.items[0].productId).toBe(product.id);
    expect(persistedOrder.items[0].quantity).toBe(2);
    expect(result.totalAmount).toBe(50);
  });

  it('rolls back stock decrement when order creation fails', async () => {
    const product = await createProduct(10, 30);
    const nonExistentUserId = 99999999;

    await expect(
      service.createOrder(nonExistentUserId, {
        items: [{ productId: product.id, quantity: 3 }],
      }),
    ).rejects.toThrow();

    const productAfterFailure = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stockQuantity: true },
    });

    const relatedOrderItems = await prisma.orderItem.count({
      where: {
        productId: product.id,
      },
    });

    expect(productAfterFailure.stockQuantity).toBe(10);
    expect(relatedOrderItems).toBe(0);
  });
});