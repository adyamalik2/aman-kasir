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
}
