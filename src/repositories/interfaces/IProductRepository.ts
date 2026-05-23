import type { Product } from '@/domain'

export interface IProductRepository {
  getAll(): Promise<Product[]>
  getById(id: string): Promise<Product | undefined>
  getByBarcode(barcode: string): Promise<Product | undefined>
  create(product: Product): Promise<void>
  update(product: Product): Promise<void>
  /** Soft delete: sets isActive = false */
  delete(id: string): Promise<void>
}
