import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: '4e5c8892-00e0-462c-9e96-d467f7f590a4' })
  id!: string;

  @ApiProperty({ example: 'SKU1001' })
  sku!: string;

  @ApiProperty({ example: 'Noise Cancelling Headphones' })
  name!: string;

  @ApiProperty({ example: 199.99 })
  price!: number;

  @ApiProperty({ example: 25 })
  stockQuantity!: number;
}
