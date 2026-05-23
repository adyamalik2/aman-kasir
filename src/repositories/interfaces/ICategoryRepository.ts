import type { Category } from '@/domain'

export interface ICategoryRepository {
  getAll(): Promise<Category[]>
}
