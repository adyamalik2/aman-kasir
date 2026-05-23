import type { ITransactionRepository } from '@/repositories/interfaces/ITransactionRepository'
import type { IProductRepository } from '@/repositories/interfaces/IProductRepository'
import type { ICategoryRepository } from '@/repositories/interfaces/ICategoryRepository'
import { resolvePeriod, type PeriodInput } from '@/lib/period'
import type { CategoryProfitEntry, ProductProfitEntry, ProfitReport } from './types'

export class GetProfitReportUseCase {
  constructor(
    private readonly transactionRepo: ITransactionRepository,
    private readonly productRepo: IProductRepository,
    private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(period: PeriodInput): Promise<ProfitReport> {
    const { start, end } = resolvePeriod(period)
    const transactions = await this.transactionRepo.getCompletedInRange(start, end)
    const txnIds = transactions.map((t) => t.id)
    const items = await this.transactionRepo.getItemsByTransactionIds(txnIds)

    const [products, categories] = await Promise.all([
      this.productRepo.getAll(),
      this.categoryRepo.getAll(),
    ])

    const productMap = new Map(products.map((p) => [p.id, p]))
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]))
    const uncategorized = 'Tanpa Kategori'

    const perProdukMap = new Map<string, ProductProfitEntry>()
    const perKategoriMap = new Map<string, CategoryProfitEntry>()

    for (const item of items) {
      const product = productMap.get(item.productId)
      const categoryId = product?.categoryId ?? ''
      const categoryName = categoryId
        ? (categoryMap.get(categoryId) ?? uncategorized)
        : uncategorized
      const profit = (item.price - item.costPrice) * item.qty

      const prodKey = item.productId
      const existingProd = perProdukMap.get(prodKey)
      if (existingProd) {
        existingProd.grossProfit += profit
        existingProd.revenue += item.subtotal
        existingProd.qtySold += item.qty
      } else {
        perProdukMap.set(prodKey, {
          productId: item.productId,
          productName: item.productName,
          categoryId: categoryId || undefined,
          categoryName,
          grossProfit: profit,
          revenue: item.subtotal,
          qtySold: item.qty,
        })
      }

      const catKey = categoryId || '__none__'
      const existingCat = perKategoriMap.get(catKey)
      if (existingCat) {
        existingCat.grossProfit += profit
        existingCat.revenue += item.subtotal
      } else {
        perKategoriMap.set(catKey, {
          categoryId: catKey,
          categoryName,
          grossProfit: profit,
          revenue: item.subtotal,
        })
      }
    }

    const perProduk = [...perProdukMap.values()].sort(
      (a, b) => b.grossProfit - a.grossProfit,
    )
    const perKategori = [...perKategoriMap.values()].sort(
      (a, b) => b.grossProfit - a.grossProfit,
    )

    return { perKategori, perProduk }
  }
}
