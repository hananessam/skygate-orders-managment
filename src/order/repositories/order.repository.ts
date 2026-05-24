import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const productStockSelect = {
  id: true,
  price: true,
  stockQuantity: true,
} satisfies Prisma.ProductSelect;

const orderItemResponseSelect = {
  id: true,
  orderId: true,
  productId: true,
  quantity: true,
  priceAtPurchase: true,
} satisfies Prisma.OrderItemSelect;

const orderResponseSelect = {
  id: true,
  userId: true,
  status: true,
  totalAmount: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: orderItemResponseSelect,
  },
} satisfies Prisma.OrderSelect;

export type ProductStockRow = Prisma.ProductGetPayload<{
  select: typeof productStockSelect;
}>;

export type OrderRow = Prisma.OrderGetPayload<{
  select: typeof orderResponseSelect;
}>;

interface CreateOrderRowInput {
  userId: number;
  totalAmount: Prisma.Decimal;
  items: Array<{
    productId: string;
    quantity: number;
    priceAtPurchase: Prisma.Decimal;
  }>;
}

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async withTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(callback);
  }

  async lockProductsForUpdate(
    tx: Prisma.TransactionClient,
    productIds: string[],
  ): Promise<void> {
    if (productIds.length === 0) {
      return;
    }

    await tx.$queryRaw`
      SELECT "id"
      FROM "products"
      WHERE "id" IN (${Prisma.join(productIds)})
      ORDER BY "id"
      FOR UPDATE
    `;
  }

  async findActiveProductsByIds(
    tx: Prisma.TransactionClient,
    productIds: string[],
  ): Promise<ProductStockRow[]> {
    if (productIds.length === 0) {
      return [];
    }

    return tx.product.findMany({
      where: {
        id: { in: productIds },
        isDeleted: false,
        stockQuantity: { gt: 0 },
      },
      select: productStockSelect,
    });
  }

  async decrementProductStock(
    tx: Prisma.TransactionClient,
    productId: string,
    quantity: number,
  ): Promise<void> {
    await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        stockQuantity: { decrement: quantity },
      },
    });
  }

  async createOrder(
    tx: Prisma.TransactionClient,
    input: CreateOrderRowInput,
  ): Promise<OrderRow> {
    return tx.order.create({
      data: {
        userId: input.userId,
        status: OrderStatus.pending,
        totalAmount: input.totalAmount,
        items: {
          create: input.items,
        },
      },
      select: orderResponseSelect,
    });
  }

  async findOrdersAndCount(
    where: Prisma.OrderWhereInput,
    skip: number,
    take: number,
  ): Promise<[OrderRow[], number]> {
    return this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: orderResponseSelect,
      }),
      this.prisma.order.count({ where }),
    ]);
  }
}
