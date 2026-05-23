import { db } from './dexie'
import { generateId } from '@/lib/id-generator'
import type { Category, Product, StockMovement } from '@/domain'

interface SeedCategory {
  name: string
  description?: string
}

const DEFAULT_CATEGORIES: SeedCategory[] = [
  { name: 'Alat Tulis', description: 'Pena, pensil, spidol, dan sejenisnya' },
  { name: 'Kertas & Buku', description: 'Kertas HVS, buku tulis, buku gambar' },
  { name: 'Fotokopi & Print', description: 'Layanan fotokopi dan cetak dokumen' },
  { name: 'Perlengkapan Kantor', description: 'Map, stapler, clip, dan sejenisnya' },
  { name: 'Lainnya', description: 'Produk di luar kategori utama' },
]

async function seedCategories(): Promise<Record<string, string>> {
  const now = new Date().toISOString()
  const categoryIds: Record<string, string> = {}

  for (const cat of DEFAULT_CATEGORIES) {
    const id = generateId('cat')
    categoryIds[cat.name] = id

    const category: Category = {
      id,
      name: cat.name,
      description: cat.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local_only',
      syncVersion: 1,
    }

    await db.categories.add(category)
  }

  return categoryIds
}

async function seedProducts(categoryIds: Record<string, string>): Promise<void> {
  const now = new Date().toISOString()

  const products: Product[] = [
    {
      id: generateId('prod'),
      name: 'Kertas A4 80gsm',
      sku: 'PRD-00001',
      categoryId: categoryIds['Kertas & Buku'],
      costPrice: 38000,
      sellPrice: 45000,
      stock: 50,
      minStock: 5,
      unit: 'rim',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local_only',
      syncVersion: 1,
    },
    {
      id: generateId('prod'),
      name: 'Fotokopi Hitam Putih',
      sku: 'PRD-00002',
      categoryId: categoryIds['Fotokopi & Print'],
      costPrice: 200,
      sellPrice: 500,
      stock: 9999,
      minStock: 0,
      unit: 'lembar',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local_only',
      syncVersion: 1,
    },
    {
      id: generateId('prod'),
      name: 'Print Warna A4',
      sku: 'PRD-00003',
      categoryId: categoryIds['Fotokopi & Print'],
      costPrice: 1000,
      sellPrice: 2000,
      stock: 9999,
      minStock: 0,
      unit: 'lembar',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local_only',
      syncVersion: 1,
    },
    {
      id: generateId('prod'),
      name: 'Map Plastik',
      sku: 'PRD-00004',
      categoryId: categoryIds['Perlengkapan Kantor'],
      costPrice: 3000,
      sellPrice: 5000,
      stock: 20,
      minStock: 5,
      unit: 'pcs',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local_only',
      syncVersion: 1,
    },
    {
      id: generateId('prod'),
      name: 'Spidol Boardmarker',
      sku: 'PRD-00005',
      categoryId: categoryIds['Alat Tulis'],
      costPrice: 8000,
      sellPrice: 12000,
      stock: 15,
      minStock: 3,
      unit: 'pcs',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local_only',
      syncVersion: 1,
    },
  ]

  await db.products.bulkAdd(products)

  // Record initial stock movements
  const movements: StockMovement[] = products
    .filter((p) => p.stock > 0)
    .map((p) => ({
      id: generateId('sm'),
      productId: p.id,
      type: 'initial' as const,
      qtyChange: p.stock,
      qtyBefore: 0,
      qtyAfter: p.stock,
      notes: 'Stok awal (seed)',
      createdAt: now,
    }))

  await db.stockMovements.bulkAdd(movements)
}

/**
 * Seed data demo untuk pertama kali aplikasi dibuka.
 * Idempotent: hanya berjalan jika database kosong.
 */
export async function seedDemoData(): Promise<void> {
  const [productCount, categoryCount] = await Promise.all([
    db.products.count(),
    db.categories.count(),
  ])

  if (productCount > 0 || categoryCount > 0) {
    return
  }

  const categoryIds = await seedCategories()
  await seedProducts(categoryIds)
}
