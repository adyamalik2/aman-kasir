import Dexie, { type Table } from 'dexie'
import type { Product, Transaction, TransactionItem, Category, StockMovement } from '@/domain'
import { DB_NAME, DEXIE_SCHEMA_V1, DEXIE_SCHEMA_V2 } from './schema'

export class AmanKasirDatabase extends Dexie {
  products!: Table<Product, string>
  categories!: Table<Category, string>
  transactions!: Table<Transaction, string>
  transactionItems!: Table<TransactionItem, string>
  stockMovements!: Table<StockMovement, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores(DEXIE_SCHEMA_V1)
    this.version(2).stores(DEXIE_SCHEMA_V2)
  }
}

export const db = new AmanKasirDatabase()
