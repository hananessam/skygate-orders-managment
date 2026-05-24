import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductResponseDto } from './dto/product-response.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

const productResponseSelect = {
  id: true,
  sku: true,
  name: true,
  price: true,
  stockQuantity: true,
} satisfies Prisma.ProductSelect;

type ProductReadModel = Prisma.ProductGetPayload<{
  select: typeof productResponseSelect;
}>;

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: productResponseSelect,
    });

    return products.map((product) => this.toResponse(product));
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      select: productResponseSelect,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.toResponse(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    const updateData: Prisma.ProductUpdateInput = {};
    if (typeof dto.price === 'number') {
      updateData.price = new Prisma.Decimal(dto.price);
    }

    if (typeof dto.stockQuantity === 'number') {
      updateData.stockQuantity = dto.stockQuantity;
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: updateData,
      select: productResponseSelect,
    });

    return this.toResponse(product);
  }

  async softDelete(id: string): Promise<void> {
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });
  }

  private toResponse(product: ProductReadModel): ProductResponseDto {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price.toNumber(),
      stockQuantity: product.stockQuantity,
    };
  }
}
