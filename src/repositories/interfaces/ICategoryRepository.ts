import type { Category } from '@/domain'

export interface ICategoryRepository {
  getAll(): Promise<Category[]>
  create(category: Category): Promise<void>
  /** Ganti nama (dan deskripsi opsional) kategori berdasarkan id */
  update(id: string, name: string, description?: string): Promise<void>
  /** Hard delete — panggil hanya setelah memastikan 0 produk aktif */
  delete(id: string): Promise<void>
  /** Hitung produk aktif yang menggunakan kategori ini */
  countActiveProducts(categoryId: string): Promise<number>
}
