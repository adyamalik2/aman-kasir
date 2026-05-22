import type { BaseSyncFields } from './sync'

export interface Product extends BaseSyncFields {
  name: string
  sku: string
  barcode?: string
  categoryId?: string
  costPrice: number
  sellPrice: number
  stock: number
  minStock: number
  unit: string
  imageUrl?: string
  isActive: boolean
}
