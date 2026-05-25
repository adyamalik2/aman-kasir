import type { Product, Category, Transaction, TransactionItem, StockMovement, Customer } from '@/domain'

/**
 * v1 — schema awal (tanpa customers)
 * v2 — tambah field customers (opsional, backward-compat dengan v1)
 */
export const BACKUP_VERSION = 2

export interface BackupSettings {
  storeName?: string
}

export interface BackupFile {
  version: number
  timestamp: string
  products: Product[]
  categories: Category[]
  transactions: Transaction[]
  transaction_items: TransactionItem[]
  stock_movements: StockMovement[]
  /** Opsional: tidak ada di backup v1 lama */
  customers?: Customer[]
  settings: BackupSettings
}

export type RestoreMode = 'replace' | 'merge'

export interface RestoreCounts {
  products: number
  categories: number
  transactions: number
  transaction_items: number
  stock_movements: number
  customers: number
}

export interface RestoreResult {
  success: boolean
  restored: RestoreCounts
  error?: string
}

export interface BackupPreview {
  products: number
  categories: number
  transactions: number
  transaction_items: number
  stock_movements: number
  customers: number
  timestamp: string
  version: number
}
