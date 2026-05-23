import type { ITransactionRepository } from '@/repositories/interfaces/ITransactionRepository'
import { resolvePeriod, type PeriodInput } from '@/lib/period'
import type { TopProductEntry, TopProductsReport } from './types'

const TOP_LIMIT = 10

export class GetTopProductsUseCase {
  constructor(private readonly transactionRepo: ITransactionRepository) {}

  async execute(period: PeriodInput): Promise<TopProductsReport> {
    const { start, end } = resolvePeriod(period)
    const transactions = await this.transactionRepo.getCompletedInRange(start, end)
    const txnIds = transactions.map((t) => t.id)
    const items = await this.transactionRepo.getItemsByTransactionIds(txnIds)

    const aggregated = new Map<string, TopProductEntry>()

    for (const item of items) {
      const existing = aggregated.get(item.productId)
      if (existing) {
        existing.qtySold += item.qty
        existing.revenue += item.subtotal
      } else {
        aggregated.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          qtySold: item.qty,
          revenue: item.subtotal,
        })
      }
    }

    const all = [...aggregated.values()]
    const byQty = [...all].sort((a, b) => b.qtySold - a.qtySold).slice(0, TOP_LIMIT)
    const byRevenue = [...all].sort((a, b) => b.revenue - a.revenue).slice(0, TOP_LIMIT)

    return { byQty, byRevenue }
  }
}
