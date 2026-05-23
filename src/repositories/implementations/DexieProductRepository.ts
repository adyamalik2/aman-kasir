import type { IProductRepository } from '@/repositories/interfaces/IProductRepository'
import type { Product } from '@/domain'
import { db } from '@/infra/db/dexie'

export class DexieProductRepository implements IProductRepository {
  async getAll(): Promise<Product[]> {
    return db.products.filter((p) => p.isActive).toArray()
  }

  async getById(id: string): Promise<Product | undefined> {
    return db.products.get(id)
  }

  async getByBarcode(barcode: string): Promise<Product | undefined> {
    return db.products.where('barcode').equals(barcode).first()
  }

  async create(product: Product): Promise<void> {
    await db.products.add(product)
  }

  async update(product: Product): Promise<void> {
    await db.products.put(product)
  }

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString()
    await db.products.update(id, {
      isActive: false,
      updatedAt: now,
      syncStatus: 'local_only',
    })
  }

  async getLowStock(): Promise<Product[]> {
    return db.products
      .filter((p) => p.isActive && p.minStock > 0 && p.stock <= p.minStock)
      .toArray()
  }

  async hardDelete(id: string): Promise<void> {
    // Atomik: hapus produk + semua stock movements-nya sekaligus
    await db.transaction('rw', [db.products, db.stockMovements], async () => {
      await db.products.delete(id)
      await db.stockMovements.where('productId').equals(id).delete()
    })
  }

  async hasTransactionHistory(id: string): Promise<boolean> {
    // productId sudah diindeks di transactionItems (schema V1)
    const item = await db.transactionItems.where('productId').equals(id).first()
    return item !== undefined
  }
}
