import { PrismaClient } from '../../src/generated/prisma/client';

type SeedProduct = {
  sku: string;
  name: string;
  price: number;
  stockQuantity: number;
};

const DEFAULT_PRODUCTS: SeedProduct[] = [
  {
    sku: 'SKU1001',
    name: 'Noise Cancelling Headphones',
    price: 199.99,
    stockQuantity: 25,
  },
  {
    sku: 'SKU1002',
    name: 'Mechanical Keyboard',
    price: 129.5,
    stockQuantity: 40,
  },
  {
    sku: 'SKU1003',
    name: 'Wireless Ergonomic Mouse',
    price: 79,
    stockQuantity: 60,
  },
];

export async function seedProducts(prisma: PrismaClient): Promise<void> {
  for (const product of DEFAULT_PRODUCTS) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        price: product.price,
        stockQuantity: product.stockQuantity,
        isDeleted: false,
      },
      create: {
        sku: product.sku,
        name: product.name,
        price: product.price,
        stockQuantity: product.stockQuantity,
      },
    });
  }
}
