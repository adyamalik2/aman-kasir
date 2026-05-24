import type { ITransactionRepository } from '@/repositories/interfaces/ITransactionRepository'
import type { IProductRepository } from '@/repositories/interfaces/IProductRepository'

export class DeleteTransactionUseCase {
  constructor(
    private readonly transactionRepo: ITransactionRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  /**
   * Hapus transaksi beserta semua item-nya.
   * @param id - ID transaksi yang akan dihapus
   * @param restoreStock - jika true, stok tiap produk dalam transaksi dikembalikan
   */
  async execute(id: string, restoreStock: boolean): Promise<void> {
    // Ambil items sebelum hapus (perlu untuk restore stok)
    const items = restoreStock
      ? await this.transactionRepo.getItemsByTransactionId(id)
      : []

    // Hapus items dulu, baru transaksi
    await this.transactionRepo.deleteItemsByTransactionId(id)
    await this.transactionRepo.delete(id)

    // Kembalikan stok jika diminta
    if (restoreStock && items.length > 0) {
      for (const item of items) {
        const product = await this.productRepo.getById(item.productId)
        if (product) {
          await this.productRepo.update({ ...product, stock: product.stock + item.qty })
        }
      }
    }
  }
}
