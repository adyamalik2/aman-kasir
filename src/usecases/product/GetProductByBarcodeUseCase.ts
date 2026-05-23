import type { IProductRepository } from '@/repositories/interfaces/IProductRepository'
import type { Product } from '@/domain'

export class GetProductByBarcodeUseCase {
  constructor(private readonly repo: IProductRepository) {}

  async execute(barcode: string): Promise<Product | undefined> {
    const trimmed = barcode.trim()
    if (!trimmed) return undefined
    return this.repo.getByBarcode(trimmed)
  }
}
