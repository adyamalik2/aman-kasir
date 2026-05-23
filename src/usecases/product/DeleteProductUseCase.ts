import type { IProductRepository } from '@/repositories/interfaces/IProductRepository'

export interface DeleteProductResult {
  /** true jika produk pernah muncul di riwayat transaksi */
  hadHistory: boolean
}

export class DeleteProductUseCase {
  constructor(private readonly repo: IProductRepository) {}

  /**
   * Cek apakah produk pernah dijual — untuk menentukan level konfirmasi di UI.
   */
  async checkHistory(id: string): Promise<boolean> {
    return this.repo.hasTransactionHistory(id)
  }

  /**
   * Hard delete produk dan stock movements-nya dari database.
   * Riwayat transaksi (transaction_items) TETAP AMAN karena menyimpan
   * snapshot productName di saat transaksi dilakukan.
   */
  async execute(id: string): Promise<DeleteProductResult> {
    const hadHistory = await this.repo.hasTransactionHistory(id)
    await this.repo.hardDelete(id)
    return { hadHistory }
  }
}
