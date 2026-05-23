export const DB_NAME = 'amanKasirDB'

export const TABLE_NAMES = {
  products: 'products',
  categories: 'categories',
  transactions: 'transactions',
  transactionItems: 'transactionItems',
  stockMovements: 'stockMovements',
} as const

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES]

/**
 * V1 — Fase 0: tabel inti (products, transactions, transactionItems)
 */
export const DEXIE_SCHEMA_V1: Record<string, string> = {
  products: 'id, sku, barcode, categoryId, isActive, syncStatus, updatedAt',
  transactions:
    'id, invoiceNo, date, cashierId, customerId, paymentMethod, status, syncStatus, updatedAt',
  transactionItems: 'id, transactionId, productId, sku',
}

/**
 * V2 — Fase 1A: tabel baru (categories, stockMovements)
 * Dexie menggabungkan dengan V1 — hanya perlu menyebut tabel yang berubah/baru.
 */
export const DEXIE_SCHEMA_V2: Record<string, string> = {
  categories: 'id, name, isActive, syncStatus',
  stockMovements: 'id, productId, type, referenceId, createdAt',
}
