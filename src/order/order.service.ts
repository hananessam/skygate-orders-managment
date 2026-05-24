import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../generated/prisma/client';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import type {
  OrderResponseDto,
  PaginatedOrdersResponseDto,
} from './dto/order-response.dto';
import { OrderPlacedEvent } from './events/order-placed.event';
import {
  OrderRepository,
  type OrderRow,
} from './repositories/order.repository';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a new order for the specified user with the provided order details.
   * @param userId The ID of the user placing the order
   * @param dto The order details
   * @returns The created order
   */
  async createOrder(
    userId: number,
    dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.withTransaction((tx) =>
      this.createOrderInTransaction(tx, userId, dto.items),
    );

    this.eventEmitter.emit(
      OrderPlacedEvent.eventName,
      new OrderPlacedEvent(order.id, userId),
    );

    return this.toResponse(order);
  }

  /**
   * Retrieves a paginated list of orders for the specified user, with optional filtering by status, date range, and minimum total amount.
   * @param userId The ID of the user whose orders are being retrieved
   * @param query The query parameters for filtering and pagination
   * @returns A paginated list of orders
   */
  async listOrders(
    userId: number,
    query: ListOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }

    const where: Prisma.OrderWhereInput = {
      userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    if (query.minTotalAmount !== undefined) {
      where.totalAmount = {
        gte: new Prisma.Decimal(query.minTotalAmount),
      };
    }

    const skip = (page - 1) * limit;

    const [orders, totalItems] = await this.orderRepository.findOrdersAndCount(
      where,
      skip,
      limit,
    );

    return {
      data: orders.map((order) => this.toResponse(order)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  /**
   * Handles order creation process within a database transaction
   *
   * @param tx The transaction client
   * @param userId The ID of the user placing the order
   * @param items The items to be included in the order
   * @returns The created order
   */
  private async createOrderInTransaction(
    tx: Prisma.TransactionClient,
    userId: number,
    items: CreateOrderDto['items'],
  ): Promise<OrderRow> {
    const productIds = Array.from(new Set(items.map((item) => item.productId)));

    await this.orderRepository.lockProductsForUpdate(tx, productIds);

    const products = await this.orderRepository.findActiveProductsByIds(
      tx,
      productIds,
    );

    if (products.length !== productIds.length) {
      throw new NotFoundException(`Some products not found`);
    }

    const productsById = new Map(products.map((product) => [product.id, product]));

    let totalAmount = new Prisma.Decimal(0);

    const orderItems = items.map((item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      if (product.stockQuantity < item.quantity) {
        throw new ConflictException(
          `Insufficient stock for product ${item.productId}`,
        );
      }

      product.stockQuantity -= item.quantity;

      totalAmount = totalAmount.plus(product.price.mul(item.quantity));

      return {
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: product.price,
      };
    });

    for (const item of items) {
      await this.orderRepository.decrementProductStock(
        tx,
        item.productId,
        item.quantity,
      );
    }

    return this.orderRepository.createOrder(tx, {
      userId,
      totalAmount,
      items: orderItems,
    });
  }

  /**
   * Converts an OrderRow from the database into an OrderResponseDto for API responses.
   *
   * @param order The OrderRow object from the database.
   * @returns OrderResponseDto
   */
  private toResponse(order: OrderRow): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount.toNumber(),
      items: order.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase.toNumber(),
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
