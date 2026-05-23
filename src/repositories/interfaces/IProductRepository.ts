import type { Product } from '@/domain'

export interface IProductRepository {
  getAll(): Promise<Product[]>
  getById(id: string): Promise<Product | undefined>
  getByBarcode(barcode: string): Promise<Product | undefined>
  create(product: Product): Promise<void>
  update(product: Product): Promise<void>
  /** Soft delete: sets isActive = false */
  delete(id: string): Promise<void>
  getLowStock(): Promise<Product[]>
  /**
   * Hard delete: hapus permanen dari database.
   * Juga menghapus semua stock_movements milik produk ini secara atomik.
   */
  hardDelete(id: string): Promise<void>
  /**
   * Cek apakah produk pernah muncul di transaction_items.
   * Berguna sebelum hard delete untuk menentukan pesan konfirmasi yang tepat.
   */
  hasTransactionHistory(id: string): Promise<boolean>
}
