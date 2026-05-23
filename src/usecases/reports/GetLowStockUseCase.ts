import type { IProductRepository } from '@/repositories/interfaces/IProductRepository'
import type { Product } from '@/domain'

export class GetLowStockUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(): Promise<Product[]> {
    const products = await this.productRepo.getLowStock()
    return products.sort((a, b) => a.stock - b.stock)
  }
}
