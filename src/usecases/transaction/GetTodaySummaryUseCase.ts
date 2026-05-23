import { db } from '@/infra/db/dexie'

export interface TodaySummary {
  omzet: number
  transactionCount: number
}

export class GetTodaySummaryUseCase {
  async execute(): Promise<TodaySummary> {
    const todayStr = new Date().toDateString()

    const todayTransactions = await db.transactions
      .filter((t) => new Date(t.date).toDateString() === todayStr && t.status === 'completed')
      .toArray()

    const omzet = todayTransactions.reduce((sum, t) => sum + t.total, 0)

    return {
      omzet,
      transactionCount: todayTransactions.length,
    }
  }
}
