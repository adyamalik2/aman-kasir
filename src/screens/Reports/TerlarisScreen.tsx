import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { PeriodInput } from '@/lib/period'
import { formatCurrency } from '@/lib/currency'
import type { TopProductsReport } from '@/usecases/reports/types'
import { CsvExportService } from '@/services/export/CsvExportService'
import { getTopProducts } from './reportApi'
import PeriodFilter from './PeriodFilter'

const csvService = new CsvExportService()

export default function TerlarisScreen() {
  const [period, setPeriod] = useState<PeriodInput>({ preset: '7days' })
  const [report, setReport] = useState<TopProductsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTopProducts
      .execute(period)
      .then((data) => { if (!cancelled) setReport(data) })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal memuat data.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period])

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/laporan"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-dark-elevated active:bg-neutral-200 dark:active:bg-dark-border"
        >
          <span className="text-xl text-primary">‹</span>
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">Laporan</p>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Produk Terlaris</h2>
        </div>
      </div>

      <PeriodFilter period={period} onChange={setPeriod} />

      {report && (report.byQty.length > 0 || report.byRevenue.length > 0) && (
        <button
          type="button"
          onClick={() => csvService.exportTopProducts(report.byQty, 'produk-terlaris-qty.csv')}
          className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-border"
        >
          Export CSV
        </button>
      )}

      {error && (
        <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-neutral-400">Memuat produk terlaris...</div>
      ) : report ? (
        <div className="space-y-6">
          <RankList title="Terlaris (Qty Terjual)" entries={report.byQty} mode="qty" />
          <RankList title="Terlaris (Omzet)" entries={report.byRevenue} mode="revenue" />
        </div>
      ) : null}
    </section>
  )
}

function RankList({
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
        <h3 className="text-sm font-bold text-neutral-700 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-neutral-400 dark:text-dark-muted">Belum ada penjualan pada periode ini.</p>
      </div>
    )
  }
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-neutral-700 dark:text-white">{title}</h3>
      <ol className="space-y-2">
        {entries.map((entry, idx) => (
          <li
            key={`${entry.productId}-${mode}`}
            className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 text-xs font-bold text-primary dark:text-primary-400">
                {idx + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{entry.productName}</p>
                {entry.sku && <p className="text-xs text-neutral-400 dark:text-dark-muted">{entry.sku}</p>}
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
