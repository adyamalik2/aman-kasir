import type { Transaction, TransactionItem } from '@/domain'

export interface ITransactionRepository {
  getAll(): Promise<Transaction[]>
  getById(id: string): Promise<Transaction | undefined>
  create(transaction: Transaction, items: TransactionItem[]): Promise<void>
  getItemsByTransactionId(transactionId: string): Promise<TransactionItem[]>
  getCompletedInRange(start: Date, end: Date): Promise<Transaction[]>
  getItemsByTransactionIds(transactionIds: string[]): Promise<TransactionItem[]>
  /** Hapus satu transaksi berdasarkan id */
  delete(id: string): Promise<void>
  /** Hapus semua item milik satu transaksi */
  deleteItemsByTransactionId(transactionId: string): Promise<void>
  /** Hapus banyak transaksi sekaligus secara atomik (beserta semua item-nya) */
  bulkDelete(ids: string[]): Promise<void>
}
