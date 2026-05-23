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
        <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-neutral-500">Memuat stok menipis...</p>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-surface p-8 text-center">
          <p className="text-sm text-neutral-500">Semua stok produk aman.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-warning-100 bg-warning-50/30 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">{p.name}</p>
                <p className="text-xs text-neutral-500">
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
