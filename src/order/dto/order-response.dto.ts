import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../generated/prisma/client';

export class OrderItemResponseDto {
  @ApiProperty({ example: 'cc8eb39f-22fe-4eaf-a80f-5bc4ce45fcc8' })
  id!: string;

  @ApiProperty({ example: '9dd1e6e2-420f-41ec-9ea8-2eaa64ea4700' })
  orderId!: string;

  @ApiProperty({ example: '4e5c8892-00e0-462c-9e96-d467f7f590a4' })
  productId!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 199.99 })
  priceAtPurchase!: number;
}

export class OrderResponseDto {
  @ApiProperty({ example: '9dd1e6e2-420f-41ec-9ea8-2eaa64ea4700' })
  id!: string;

  @ApiProperty({ example: 1 })
  userId!: number;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.pending })
  status!: OrderStatus;

  @ApiProperty({ example: 399.98 })
  totalAmount!: number;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty({ example: '2026-05-23T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-23T12:00:00.000Z' })
  updatedAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;

  @ApiProperty({ example: 5 })
  totalItems!: number;
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  data!: OrderResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
