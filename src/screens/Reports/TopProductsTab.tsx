import { useState, useEffect } from 'react'
import type { PeriodInput } from '@/lib/period'
import { formatCurrency } from '@/lib/currency'
import type { TopProductsReport } from '@/usecases/reports/types'
import { CsvExportService } from '@/services/export/CsvExportService'
import { getTopProducts } from './reportApi'
import PeriodFilter from './PeriodFilter'
import ExportButtons, { ExportButton } from './ExportButtons'

const csvService = new CsvExportService()

export default function TopProductsTab() {
  const [period, setPeriod] = useState<PeriodInput>({ preset: '7days' })
  const [report, setReport] = useState<TopProductsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTopProducts
      .execute(period)
      .then((data) => {
        if (!cancelled) setReport(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat data produk.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period])

  const handleExportCsv = () => {
    if (!report) return
    csvService.exportTopProducts(report.byQty, 'produk-terlaris-qty.csv')
  }

  return (
    <div className="space-y-4">
      <PeriodFilter period={period} onChange={setPeriod} />
      <ExportButtons>
        <ExportButton
          label="Export CSV"
          onClick={handleExportCsv}
          disabled={!report || report.byQty.length === 0}
        />
      </ExportButtons>

      {error && (
        <div className="rounded-md bg-danger-50 dark:bg-danger-700/20 px-3 py-2 text-sm text-danger-700 dark:text-danger-500">{error}</div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-neutral-500">Memuat produk terlaris...</p>
      ) : report ? (
        <div className="space-y-6">
          <ProductRankList title="Terlaris (Qty)" entries={report.byQty} mode="qty" />
          <ProductRankList title="Terlaris (Omzet)" entries={report.byRevenue} mode="revenue" />
        </div>
      ) : null}
    </div>
  )
}

function ProductRankList({
  title,
  entries,
  mode,
}: {
  title: string
  entries: TopProductsReport['byQty']
  mode: 'qty' | 'revenue'
}) {
  if (entries.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
        <p className="mt-2 text-sm text-neutral-400">Belum ada penjualan pada periode ini.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
      <ol className="mt-2 space-y-2">
        {entries.map((entry, index) => (
          <li
            key={`${entry.productId}-${mode}`}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-surface px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">{entry.productName}</p>
                {entry.sku && <p className="text-xs text-neutral-400">{entry.sku}</p>}
              </div>
            </div>
            <p className="ml-2 shrink-0 font-mono text-sm font-semibold text-primary">
              {mode === 'qty' ? `${entry.qtySold}×` : formatCurrency(entry.revenue)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
