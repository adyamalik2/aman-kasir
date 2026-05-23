import type { IProductRepository } from '@/repositories/interfaces/IProductRepository'
import type { Product } from '@/domain'
import { generateId } from '@/lib/id-generator'

export interface CreateProductInput {
  name: string
  sku?: string
  barcode?: string
  categoryId?: string
  costPrice: number
  sellPrice: number
  stock: number
  minStock: number
  unit: string
}

function generateAutoSku(): string {
  const digits = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0')
  return `PRD-${digits}`
}

export class CreateProductUseCase {
  constructor(private readonly repo: IProductRepository) {}

  async execute(input: CreateProductInput): Promise<Product> {
    const now = new Date().toISOString()

    const product: Product = {
      id: generateId('prod'),
      name: input.name.trim(),
      sku: input.sku?.trim() || generateAutoSku(),
      barcode: input.barcode?.trim() || undefined,
      categoryId: input.categoryId || undefined,
      costPrice: input.costPrice,
      sellPrice: input.sellPrice,
      stock: input.stock,
      minStock: input.minStock,
      unit: input.unit.trim() || 'pcs',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local_only',
      syncVersion: 1,
    }

    await this.repo.create(product)
    return product
  }
}
