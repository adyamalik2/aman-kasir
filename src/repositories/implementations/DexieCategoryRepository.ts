import type { ICategoryRepository } from '@/repositories/interfaces/ICategoryRepository'
import type { Category } from '@/domain'
import { db } from '@/infra/db/dexie'

export class DexieCategoryRepository implements ICategoryRepository {
  async getAll(): Promise<Category[]> {
    return db.categories.toArray()
  }
}
