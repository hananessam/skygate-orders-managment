-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
