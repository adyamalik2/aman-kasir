import Dexie, { type Table } from 'dexie'
import type { Product, Transaction, TransactionItem } from '@/domain'
import { DB_NAME, DB_VERSION, DEXIE_SCHEMA } from './schema'

export class AmanKasirDatabase extends Dexie {
  products!: Table<Product, string>
  transactions!: Table<Transaction, string>
  transactionItems!: Table<TransactionItem, string>

  constructor() {
    super(DB_NAME)
    this.version(DB_VERSION).stores(DEXIE_SCHEMA)
  }
}

export const db = new AmanKasirDatabase()
