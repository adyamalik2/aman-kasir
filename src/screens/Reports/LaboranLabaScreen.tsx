import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { PeriodInput } from '@/lib/period'
import { formatCurrency } from '@/lib/currency'
import type { ProfitReport } from '@/usecases/reports/types'
import PeriodFilter from './PeriodFilter'
import { getProfitReport } from './reportApi'
import { CsvExportService } from '@/services/export/CsvExportService'

const csvService = new CsvExportService()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtPct(profit: number, revenue: number): string {
  if (revenue <= 0) return '—'
  return `${((profit / revenue) * 100).toFixed(1)}%`
}

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

export default function LaboranLabaScreen() {
  const [period, setPeriod] = useState<PeriodInput>({ preset: '7days' })
  const [report, setReport] = useState<ProfitReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'kategori' | 'produk'>('produk')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getProfitReport
      .execute(period)
      .then((data) => { if (!cancelled) setReport(data) })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal memuat data.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period])

  const totalProfit = report?.perProduk.reduce((s, p) => s + p.grossProfit, 0) ?? 0
  const totalRevenue = report?.perProduk.reduce((s, p) => s + p.revenue, 0) ?? 0

  return (
    <section className="space-y-4 pb-4">
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
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Laba & Margin</h2>
        </div>
      </div>

      <PeriodFilter period={period} onChange={setPeriod} />

      {error && (
        <div className="rounded-md bg-danger-50 dark:bg-danger-700/20 px-3 py-2 text-sm text-danger-700 dark:text-danger-500">{error}</div>
      )}

      {!loading && report && report.perProduk.length > 0 && (
        <button
          type="button"
          onClick={() => csvService.exportProfitReport(report.perProduk)}
          className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-border"
        >
          Export CSV
        </button>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-neutral-400 dark:text-dark-muted">Menghitung laba...</div>
      ) : report ? (
        <>
          {/* Ringkasan total */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">Omzet</p>
              <p className="mt-1 font-mono text-sm font-bold text-neutral-900 dark:text-white">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="rounded-xl border border-success-100 dark:border-success-700/40 bg-success-50 dark:bg-success-700/10 px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-success-700 dark:text-success-400">Laba Kotor</p>
              <p className="mt-1 font-mono text-sm font-bold text-success-700 dark:text-success-400">{formatCurrency(totalProfit)}</p>
            </div>
            <div className="rounded-xl border border-primary-100 dark:border-primary-900/50 bg-primary-50 dark:bg-primary-900/20 px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary dark:text-primary-400">Margin</p>
              <p className="mt-1 font-mono text-sm font-bold text-primary dark:text-primary-400">{fmtPct(totalProfit, totalRevenue)}</p>
            </div>
          </div>

          {/* Tab */}
          <div className="flex gap-1">
            {(['produk', 'kategori'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  tab === t
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 dark:bg-dark-elevated text-neutral-600 dark:text-white hover:bg-neutral-200 dark:hover:bg-dark-border'
                }`}
              >
                {t === 'produk' ? 'Per Produk' : 'Per Kategori'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'produk' ? (
            <ProdukList entries={report.perProduk} />
          ) : (
            <KategoriList entries={report.perKategori} />
          )}
        </>
      ) : null}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Sub-komponen: Per Produk
// ---------------------------------------------------------------------------

function ProdukList({ entries }: { entries: ProfitReport['perProduk'] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-8 text-center">
        <p className="text-2xl">📊</p>
        <p className="mt-2 text-sm font-semibold text-neutral-700 dark:text-white">Belum ada data penjualan</p>
        <p className="mt-1 text-xs text-neutral-400 dark:text-dark-muted">Data laba akan muncul setelah ada transaksi pada periode ini.</p>
      </div>
    )
  }

  return (
    <ol className="space-y-2">
      {entries.map((entry, idx) => (
        <li
          key={entry.productId}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card px-4 py-3"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 text-xs font-bold text-primary dark:text-primary-400">
            {idx + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{entry.productName}</p>
            <p className="text-xs text-neutral-400 dark:text-dark-muted">
              {entry.categoryName}
              {' · '}
              <span className="font-mono">{entry.qtySold}×</span>
              {' · '}
              Omzet <span className="font-mono">{formatCurrency(entry.revenue)}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`font-mono text-sm font-bold ${entry.grossProfit >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-700 dark:text-danger-500'}`}>
              {formatCurrency(entry.grossProfit)}
            </p>
            <p className="text-xs text-neutral-400 dark:text-dark-muted">
              {fmtPct(entry.grossProfit, entry.revenue)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

// ---------------------------------------------------------------------------
// Sub-komponen: Per Kategori
// ---------------------------------------------------------------------------

function KategoriList({ entries }: { entries: ProfitReport['perKategori'] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-8 text-center">
        <p className="text-2xl">📊</p>
        <p className="mt-2 text-sm font-semibold text-neutral-700 dark:text-white">Belum ada data penjualan</p>
        <p className="mt-1 text-xs text-neutral-400 dark:text-dark-muted">Data laba per kategori akan muncul setelah ada transaksi.</p>
      </div>
    )
  }

  return (
    <ol className="space-y-2">
      {entries.map((entry, idx) => (
        <li
          key={entry.categoryId}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card px-4 py-3"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 text-xs font-bold text-primary dark:text-primary-400">
            {idx + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{entry.categoryName}</p>
            <p className="text-xs text-neutral-400 dark:text-dark-muted">
              Omzet <span className="font-mono">{formatCurrency(entry.revenue)}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`font-mono text-sm font-bold ${entry.grossProfit >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-700 dark:text-danger-500'}`}>
              {formatCurrency(entry.grossProfit)}
            </p>
            <p className="text-xs text-neutral-400 dark:text-dark-muted">
              {fmtPct(entry.grossProfit, entry.revenue)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
