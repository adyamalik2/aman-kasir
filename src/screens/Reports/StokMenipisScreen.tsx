import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { CsvExportService } from '@/services/export/CsvExportService'
import { getLowStock } from './reportApi'

const csvService = new CsvExportService()

export default function StokMenipisScreen() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getLowStock
      .execute()
      .then((data) => { if (!cancelled) setProducts(data) })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal memuat data.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

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
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Stok Menipis</h2>
        </div>
      </div>

      {products.length > 0 && (
        <button
          type="button"
          onClick={() => csvService.exportLowStock(products)}
          className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-border"
        >
          Export CSV
        </button>
      )}

      {error && (
        <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-neutral-400">Memuat stok menipis...</div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-8 text-center">
          <p className="text-2xl">✅</p>
          <p className="mt-2 text-sm font-semibold text-neutral-700 dark:text-white">Semua stok produk aman</p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-dark-muted">Tidak ada produk yang stoknya di bawah minimum.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-warning-200 dark:border-warning-700/50 bg-warning-50/40 dark:bg-warning-700/10 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-neutral-900 dark:text-white">{p.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-dark-muted">
                  Stok:{' '}
                  <span className="font-semibold text-danger-700 dark:text-danger-400">
                    {p.stock} {p.unit}
                  </span>{' '}
                  · Min: {p.minStock} · {formatCurrency(p.sellPrice)}
                </p>
              </div>
              <Link
                to={`/produk?edit=${p.id}`}
                className="ml-3 shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white active:bg-primary-800"
              >
                Edit Stok
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
