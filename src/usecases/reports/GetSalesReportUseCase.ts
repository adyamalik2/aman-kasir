import type { ITransactionRepository } from '@/repositories/interfaces/ITransactionRepository'
import { resolvePeriod, type PeriodInput } from '@/lib/period'
import type { SalesReport } from './types'
import { buildDailyBreakdown, calcGrossProfitFromItems } from './reportHelpers'

export class GetSalesReportUseCase {
  constructor(private readonly transactionRepo: ITransactionRepository) {}

  async execute(period: PeriodInput): Promise<SalesReport> {
    const { start, end } = resolvePeriod(period)
    const transactions = await this.transactionRepo.getCompletedInRange(start, end)
    const txnIds = transactions.map((t) => t.id)
    const items = await this.transactionRepo.getItemsByTransactionIds(txnIds)

    const totalOmzet = transactions.reduce((sum, t) => sum + t.total, 0)
    const totalLabaKotor = calcGrossProfitFromItems(items)
    const totalTransaksi = transactions.length
    const rataRataPerTransaksi =
      totalTransaksi > 0 ? Math.round(totalOmzet / totalTransaksi) : 0

    return {
      totalOmzet,
      totalTransaksi,
      totalLabaKotor,
      rataRataPerTransaksi,
      breakdownPerHari: buildDailyBreakdown(transactions, items),
    }
  }
}
