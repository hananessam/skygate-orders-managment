import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class OrderItemInputDto {
  @ApiProperty({
    example: '4e5c8892-00e0-462c-9e96-d467f7f590a4',
    description: 'Product UUID',
  })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    example: 2,
    minimum: 1,
    description: 'Quantity to order',
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}
