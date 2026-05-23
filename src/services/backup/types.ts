import type { Product, Category, Transaction, TransactionItem, StockMovement } from '@/domain'

export const BACKUP_VERSION = 1

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
  settings: BackupSettings
}

export type RestoreMode = 'replace' | 'merge'

export interface RestoreCounts {
  products: number
  categories: number
  transactions: number
  transaction_items: number
  stock_movements: number
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
  timestamp: string
  version: number
}
