import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: 249.99,
    description: 'Updated product price. Must be greater than 0',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price?: number;

  @ApiPropertyOptional({
    example: 50,
    description: 'Updated stock quantity. Must be greater than or equal to 0',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;
}
