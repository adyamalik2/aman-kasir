import type { ITransactionRepository } from '@/repositories/interfaces/ITransactionRepository'
import type { IProductRepository } from '@/repositories/interfaces/IProductRepository'

export class BulkDeleteTransactionsUseCase {
  constructor(
    private readonly transactionRepo: ITransactionRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  /**
   * Hapus banyak transaksi sekaligus secara atomik.
   * @param ids - array ID transaksi yang akan dihapus
   * @param restoreStock - jika true, stok tiap produk dikembalikan (diagregasi per produk)
   */
  async execute(ids: string[], restoreStock: boolean): Promise<void> {
    if (ids.length === 0) return

    // Ambil semua items sebelum hapus jika perlu restore stok
    let allItems: Awaited<ReturnType<ITransactionRepository['getItemsByTransactionIds']>> = []
    if (restoreStock) {
      allItems = await this.transactionRepo.getItemsByTransactionIds(ids)
    }

    // Hapus atomik — all-or-nothing
    await this.transactionRepo.bulkDelete(ids)

    // Restore stok: aggregate qty per productId dulu, lalu update sekali per produk
    if (restoreStock && allItems.length > 0) {
      const qtyByProduct = new Map<string, number>()
      for (const item of allItems) {
        qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.qty)
      }

      for (const [productId, qty] of qtyByProduct) {
        const product = await this.productRepo.getById(productId)
        if (product) {
          await this.productRepo.update({ ...product, stock: product.stock + qty })
        }
      }
    }
  }
}
