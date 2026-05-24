import Dexie, { type Table } from 'dexie'
import type { Product, Transaction, TransactionItem, Category, StockMovement, Customer } from '@/domain'
import { DB_NAME, DEXIE_SCHEMA_V1, DEXIE_SCHEMA_V2, DEXIE_SCHEMA_V3 } from './schema'

export class AmanKasirDatabase extends Dexie {
  products!: Table<Product, string>
  categories!: Table<Category, string>
  transactions!: Table<Transaction, string>
  transactionItems!: Table<TransactionItem, string>
  stockMovements!: Table<StockMovement, string>
  customers!: Table<Customer, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores(DEXIE_SCHEMA_V1)
    this.version(2).stores(DEXIE_SCHEMA_V2)
    this.version(3).stores(DEXIE_SCHEMA_V3)
  }
}

export const db = new AmanKasirDatabase()
