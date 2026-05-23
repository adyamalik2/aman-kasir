import type { ICategoryRepository } from '@/repositories/interfaces/ICategoryRepository'
import type { Category } from '@/domain'
import { db } from '@/infra/db/dexie'

export class DexieCategoryRepository implements ICategoryRepository {
  async getAll(): Promise<Category[]> {
    return db.categories.toArray()
  }

  async create(category: Category): Promise<void> {
    await db.categories.add(category)
  }

  async update(id: string, name: string, description?: string): Promise<void> {
    const now = new Date().toISOString()
    await db.categories.update(id, {
      name,
      description,
      updatedAt: now,
      syncStatus: 'local_only' as const,
    })
  }

  async delete(id: string): Promise<void> {
    await db.categories.delete(id)
  }

  async countActiveProducts(categoryId: string): Promise<number> {
    return db.products.filter((p) => p.isActive && p.categoryId === categoryId).count()
  }
}
