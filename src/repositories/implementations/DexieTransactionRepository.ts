import type { ITransactionRepository } from '@/repositories/interfaces/ITransactionRepository'
import type { Transaction, TransactionItem } from '@/domain'
import { db } from '@/infra/db/dexie'

export class DexieTransactionRepository implements ITransactionRepository {
  async getAll(): Promise<Transaction[]> {
    return db.transactions.orderBy('date').reverse().toArray()
  }

  async getById(id: string): Promise<Transaction | undefined> {
    return db.transactions.get(id)
  }

  async create(transaction: Transaction, items: TransactionItem[]): Promise<void> {
    await db.transactions.add(transaction)
    await db.transactionItems.bulkAdd(items)
  }

  async getItemsByTransactionId(transactionId: string): Promise<TransactionItem[]> {
    return db.transactionItems.where('transactionId').equals(transactionId).toArray()
  }

  async getCompletedInRange(start: Date, end: Date): Promise<Transaction[]> {
    const startIso = start.toISOString()
    const endIso = end.toISOString()
    return db.transactions
      .filter(
        (t) => t.status === 'completed' && t.date >= startIso && t.date <= endIso,
      )
      .toArray()
  }

  async getItemsByTransactionIds(transactionIds: string[]): Promise<TransactionItem[]> {
    if (transactionIds.length === 0) {
      return []
    }
    return db.transactionItems.where('transactionId').anyOf(transactionIds).toArray()
  }

  async delete(id: string): Promise<void> {
    await db.transactions.delete(id)
  }

  async deleteItemsByTransactionId(transactionId: string): Promise<void> {
    await db.transactionItems.where('transactionId').equals(transactionId).delete()
  }

  async bulkDelete(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    // Gunakan Dexie transaction untuk atomicity: all-or-nothing
    await db.transaction('rw', [db.transactions, db.transactionItems], async () => {
      await db.transactionItems.where('transactionId').anyOf(ids).delete()
      await db.transactions.bulkDelete(ids)
    })
  }
}
