import type { Transaction, TransactionItem } from '@/domain'
import { toDayKey } from '@/lib/period'
import type { DailyBreakdown } from './types'

export function calcGrossProfitFromItems(items: TransactionItem[]): number {
  return items.reduce((sum, item) => sum + (item.price - item.costPrice) * item.qty, 0)
}

export function buildDailyBreakdown(
  transactions: Transaction[],
  items: TransactionItem[],
): DailyBreakdown[] {
  const itemsByTxn = new Map<string, TransactionItem[]>()
  for (const item of items) {
    const list = itemsByTxn.get(item.transactionId) ?? []
    list.push(item)
    itemsByTxn.set(item.transactionId, list)
  }

  const byDay = new Map<string, DailyBreakdown>()

  for (const txn of transactions) {
    const dayKey = toDayKey(txn.date)
    const txnItems = itemsByTxn.get(txn.id) ?? []
    const profit = calcGrossProfitFromItems(txnItems)
    const existing = byDay.get(dayKey)

    if (existing) {
      existing.omzet += txn.total
      existing.transactionCount += 1
      existing.grossProfit += profit
    } else {
      byDay.set(dayKey, {
        date: txn.date,
        dayKey,
        omzet: txn.total,
        transactionCount: 1,
        grossProfit: profit,
      })
    }
  }

  return [...byDay.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey))
}
