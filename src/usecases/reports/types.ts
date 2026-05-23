import type { PeriodInput } from '@/lib/period'

export type { PeriodInput }

export interface DailyBreakdown {
  date: string
  dayKey: string
  omzet: number
  transactionCount: number
  grossProfit: number
}

export interface SalesReport {
  totalOmzet: number
  totalTransaksi: number
  totalLabaKotor: number
  rataRataPerTransaksi: number
  breakdownPerHari: DailyBreakdown[]
}

export interface TopProductEntry {
  productId: string
  productName: string
  sku?: string
  qtySold: number
  revenue: number
}

export interface TopProductsReport {
  byQty: TopProductEntry[]
  byRevenue: TopProductEntry[]
}

export interface CategoryProfitEntry {
  categoryId: string
  categoryName: string
  grossProfit: number
  revenue: number
}

export interface ProductProfitEntry {
  productId: string
  productName: string
  categoryId?: string
  categoryName: string
  grossProfit: number
  revenue: number
  qtySold: number
}

export interface ProfitReport {
  perKategori: CategoryProfitEntry[]
  perProduk: ProductProfitEntry[]
}
