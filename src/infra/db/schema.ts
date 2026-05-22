export const DB_NAME = 'amanKasirDB'

export const DB_VERSION = 1

export const TABLE_NAMES = {
  products: 'products',
  transactions: 'transactions',
  transactionItems: 'transactionItems',
} as const

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES]

export const DEXIE_SCHEMA: Record<TableName, string> = {
  products: 'id, sku, barcode, categoryId, isActive, syncStatus, updatedAt',
  transactions:
    'id, invoiceNo, date, cashierId, customerId, paymentMethod, status, syncStatus, updatedAt',
  transactionItems: 'id, transactionId, productId, sku',
}
