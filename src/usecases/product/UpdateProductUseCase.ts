import type { IProductRepository } from '@/repositories/interfaces/IProductRepository'
import type { Product } from '@/domain'

export interface UpdateProductInput {
  name?: string
  sku?: string
  barcode?: string
  categoryId?: string
  costPrice?: number
  sellPrice?: number
  stock?: number
  minStock?: number
  unit?: string
  imageUrl?: string
}

export class UpdateProductUseCase {
  constructor(private readonly repo: IProductRepository) {}

  async execute(id: string, input: UpdateProductInput): Promise<Product> {
    const existing = await this.repo.getById(id)

    if (!existing) {
      throw new Error(`Produk dengan ID ${id} tidak ditemukan.`)
    }

    const updated: Product = {
      ...existing,
      name: input.name !== undefined ? input.name : existing.name,
      sku: input.sku !== undefined ? input.sku || existing.sku : existing.sku,
      barcode: input.barcode !== undefined ? input.barcode || undefined : existing.barcode,
      categoryId:
        input.categoryId !== undefined ? input.categoryId || undefined : existing.categoryId,
      costPrice: input.costPrice !== undefined ? input.costPrice : existing.costPrice,
      sellPrice: input.sellPrice !== undefined ? input.sellPrice : existing.sellPrice,
      stock: input.stock !== undefined ? input.stock : existing.stock,
      minStock: input.minStock !== undefined ? input.minStock : existing.minStock,
      unit: input.unit !== undefined ? input.unit || existing.unit : existing.unit,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl || undefined : existing.imageUrl,
      updatedAt: new Date().toISOString(),
      syncStatus: 'local_only',
    }

    await this.repo.update(updated)
    return updated
  }
}
