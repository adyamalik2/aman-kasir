import type { IProductRepository } from '@/repositories/interfaces/IProductRepository'
import type { Product } from '@/domain'

export class GetAllProductsUseCase {
  constructor(private readonly repo: IProductRepository) {}

  async execute(categoryId?: string): Promise<Product[]> {
    const products = await this.repo.getAll()
    if (categoryId) {
      return products.filter((p) => p.categoryId === categoryId)
    }
    return products
  }
}
