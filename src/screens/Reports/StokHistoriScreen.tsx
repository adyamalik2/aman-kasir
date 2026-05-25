import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { StockMovement, Product } from '@/domain'
import { db } from '@/infra/db/dexie'
import { CsvExportService } from '@/services/export/CsvExportService'

const csvService = new CsvExportService()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDT(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function typeIcon(type: StockMovement['type']): string {
  switch (type) {
    case 'sale':       return '🛒'
    case 'purchase':   return '📦'
    case 'adjustment': return '✏️'
    case 'void':       return '↩️'
    case 'initial':    return '🏁'
    default:           return '📋'
  }
}

function typeLabel(type: StockMovement['type']): string {
  switch (type) {
    case 'sale':       return 'Penjualan'
    case 'purchase':   return 'Restock'
    case 'adjustment': return 'Penyesuaian'
    case 'void':       return 'Batal Transaksi'
    case 'initial':    return 'Stok Awal'
    default:           return type
  }
}

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

export default function StokHistoriScreen() {
  const [searchParams] = useSearchParams()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [productMap, setProductMap] = useState<Map<string, Product>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Baca productId dari URL (?productId=xxx) jika datang dari ProductsScreen
  const [filterProductId, setFilterProductId] = useState(() => searchParams.get('productId') ?? '')
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [movs, products] = await Promise.all([
          db.stockMovements.orderBy('createdAt').reverse().toArray(),
          db.products.toArray(),
        ])
        setMovements(movs)
        setProductMap(new Map(products.map((p) => [p.id, p])))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  // Produk unik yang punya pergerakan stok (untuk dropdown filter)
  const productsWithMovements = [...new Set(movements.map((m) => m.productId))]
    .map((id) => productMap.get(id))
    .filter((p): p is Product => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name))

  const filtered = movements.filter((m) => {
    if (filterProductId && m.productId !== filterProductId) return false
    if (filterType && m.type !== filterType) return false
    return true
  })

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
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Histori Stok</h2>
        </div>
      </div>

      {/* Tombol Export */}
      {!loading && filtered.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              const rows = filtered.map((m) => {
                const product = productMap.get(m.productId)
                return {
                  tanggal: m.createdAt,
                  produk: product?.name ?? '(produk dihapus)',
                  sku: product?.sku,
                  tipe: typeLabel(m.type),
                  perubahan: m.qtyChange,
                  sebelum: m.qtyBefore,
                  sesudah: m.qtyAfter,
                  catatan: m.notes,
                }
              })
              const suffix = filterProductId
                ? `-${productMap.get(filterProductId)?.name?.replace(/\s+/g, '-').toLowerCase() ?? filterProductId}`
                : ''
              csvService.exportHistoriStok(rows, `histori-stok${suffix}.csv`)
            }}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-elevated"
          >
            ⬇️ Export CSV
          </button>
        </div>
      )}

      {/* Filter produk + tipe */}
      <div className="flex gap-2">
        <select
          value={filterProductId}
          onChange={(e) => setFilterProductId(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-primary dark:focus:border-primary-400 focus:outline-none"
        >
          <option value="">Semua Produk</option>
          {productsWithMovements.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="shrink-0 rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-primary dark:focus:border-primary-400 focus:outline-none"
        >
          <option value="">Semua Tipe</option>
          <option value="purchase">Restock</option>
          <option value="sale">Penjualan</option>
          <option value="void">Batal Transaksi</option>
          <option value="adjustment">Penyesuaian</option>
          <option value="initial">Stok Awal</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-danger-50 dark:bg-danger-700/20 px-3 py-2 text-sm text-danger-700 dark:text-danger-500">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200 dark:bg-dark-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-8 text-center">
          <p className="text-2xl">📋</p>
          <p className="mt-2 text-sm font-semibold text-neutral-700 dark:text-white">Belum ada pergerakan stok</p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-dark-muted">
            {filterProductId || filterType
              ? 'Tidak ada pergerakan untuk filter yang dipilih.'
              : 'Histori akan tercatat saat restock atau transaksi penjualan.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-neutral-400 dark:text-dark-muted">
            {filtered.length} pergerakan stok
          </p>
          <ul className="space-y-2">
            {filtered.map((m) => {
              const product = productMap.get(m.productId)
              const isIn = m.qtyChange > 0
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon tipe */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${
                      isIn
                        ? 'bg-success-50 dark:bg-success-700/20'
                        : 'bg-danger-50 dark:bg-danger-700/20'
                    }`}>
                      {typeIcon(m.type)}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                            {product?.name ?? '(produk dihapus)'}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-dark-muted">
                            {typeLabel(m.type)}
                            {product?.sku ? ` · ${product.sku}` : ''}
                          </p>
                        </div>
                        {/* Perubahan qty */}
                        <div className="shrink-0 text-right">
                          <p className={`font-mono text-sm font-bold ${
                            isIn
                              ? 'text-success-700 dark:text-success-400'
                              : 'text-danger-700 dark:text-danger-500'
                          }`}>
                            {isIn ? '+' : ''}{m.qtyChange}
                            {product?.unit ? ` ${product.unit}` : ''}
                          </p>
                          <p className="text-xs text-neutral-400 dark:text-dark-muted">
                            {m.qtyBefore} → {m.qtyAfter}
                          </p>
                        </div>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-400 dark:text-dark-muted">
                        {formatDT(m.createdAt)}
                      </p>
                      {m.notes && (
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-dark-muted">
                          📝 {m.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
