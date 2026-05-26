import type { ITransactionRepository } from '@/repositories/interfaces/ITransactionRepository'
import type { IProductRepository } from '@/repositories/interfaces/IProductRepository'
import type { StockMovement } from '@/domain'
import { db } from '@/infra/db/dexie'
import { generateId } from '@/lib/id-generator'

export class DeleteTransactionUseCase {
  constructor(
    private readonly transactionRepo: ITransactionRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  /**
   * Hapus transaksi beserta semua item-nya.
   * @param id - ID transaksi yang akan dihapus
   * @param restoreStock - jika true, stok tiap produk dalam transaksi dikembalikan
   *                       dan StockMovement bertipe 'void' direkam ke histori
   */
  async execute(id: string, restoreStock: boolean): Promise<void> {
    // Ambil items sebelum hapus (perlu untuk restore stok)
    const items = restoreStock
      ? await this.transactionRepo.getItemsByTransactionId(id)
      : []

    // Hapus items dulu, baru transaksi
    await this.transactionRepo.deleteItemsByTransactionId(id)
    await this.transactionRepo.delete(id)

    // Kembalikan stok dan rekam pergerakan void jika diminta
    if (restoreStock && items.length > 0) {
      const now = new Date().toISOString()
      for (const item of items) {
        const product = await this.productRepo.getById(item.productId)
        if (product) {
          const qtyBefore = product.stock
          const qtyAfter = qtyBefore + item.qty
          await this.productRepo.update({ ...product, stock: qtyAfter })

          const movement: StockMovement = {
            id: generateId('sm'),
            productId: item.productId,
            type: 'void',
            qtyChange: item.qty,
            qtyBefore,
            qtyAfter,
            referenceId: id,
            createdAt: now,
          }
          await db.stockMovements.add(movement)
        }
      }
    }
  }
}
