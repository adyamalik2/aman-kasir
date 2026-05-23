import type { Transaction, TransactionItem } from '@/domain'

export interface ITransactionRepository {
  getAll(): Promise<Transaction[]>
  getById(id: string): Promise<Transaction | undefined>
  create(transaction: Transaction, items: TransactionItem[]): Promise<void>
  getItemsByTransactionId(transactionId: string): Promise<TransactionItem[]>
  getCompletedInRange(start: Date, end: Date): Promise<Transaction[]>
  getItemsByTransactionIds(transactionIds: string[]): Promise<TransactionItem[]>
}
