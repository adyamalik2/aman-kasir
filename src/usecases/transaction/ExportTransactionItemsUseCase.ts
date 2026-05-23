import type { ITransactionRepository } from '@/repositories/interfaces/ITransactionRepository'
import type { TransactionItem } from '@/domain'

/**
 * Use case untuk mengekspor semua item dari daftar transaksi yang diberikan.
 * Membungkus akses langsung ke ITransactionRepository sehingga screen
 * tidak perlu memegang referensi ke repository.
 */
export class ExportTransactionItemsUseCase {
  constructor(private readonly txRepo: ITransactionRepository) {}

  execute(transactionIds: string[]): Promise<TransactionItem[]> {
    if (transactionIds.length === 0) return Promise.resolve([])
    return this.txRepo.getItemsByTransactionIds(transactionIds)
  }
}
