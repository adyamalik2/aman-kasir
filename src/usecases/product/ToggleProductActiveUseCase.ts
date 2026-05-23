import type { IProductRepository } from '@/repositories/interfaces/IProductRepository'
import type { Product } from '@/domain'

export class ToggleProductActiveUseCase {
  constructor(private readonly repo: IProductRepository) {}

  async execute(id: string): Promise<Product> {
    const existing = await this.repo.getById(id)

    if (!existing) {
      throw new Error(`Produk dengan ID ${id} tidak ditemukan.`)
    }

    const updated: Product = {
      ...existing,
      isActive: !existing.isActive,
      updatedAt: new Date().toISOString(),
      syncStatus: 'local_only',
    }

    await this.repo.update(updated)
    return updated
  }
}
