import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { CsvExportService } from '@/services/export/CsvExportService'
import { getLowStock } from './reportApi'
import ExportButtons, { ExportButton } from './ExportButtons'

const csvService = new CsvExportService()

export default function LowStockTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getLowStock
      .execute()
      .then((data) => {
        if (!cancelled) setProducts(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat stok menipis.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleExportCsv = () => {
    csvService.exportLowStock(products)
  }

  return (
    <div className="space-y-4">
      <ExportButtons>
        <ExportButton
          label="Export CSV"
          onClick={handleExportCsv}
          disabled={products.length === 0}
        />
      </ExportButtons>

      {error && (
        <div className="rounded-md bg-danger-50 dark:bg-danger-700/20 px-3 py-2 text-sm text-danger-700 dark:text-danger-500">{error}</div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-neutral-500">Memuat stok menipis...</p>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-8 text-center">
          <p className="text-sm text-neutral-500 dark:text-dark-muted">Semua stok produk aman.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-warning-100 dark:border-warning-700/30 bg-warning-50/30 dark:bg-warning-700/10 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-neutral-900 dark:text-white">{p.name}</p>
                <p className="text-xs text-neutral-500 dark:text-dark-muted">
                  Stok: {p.stock} {p.unit} · Min: {p.minStock} · {formatCurrency(p.sellPrice)}
                </p>
              </div>
              <Link
                to={`/produk?edit=${p.id}`}
                className="ml-3 shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
