import { useState, useEffect } from 'react'
import type { Product } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { CsvExportService } from '@/services/export/CsvExportService'
import { getLowStock } from './reportApi'
import { db } from '@/infra/db/dexie'
import { generateId } from '@/lib/id-generator'
import { Icon, BackHeader } from '@/components/ui'

const csvService = new CsvExportService()

export default function StokMenipisScreen() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Restock sheet ──────────────────────────────────────────────────────────
  const [restockProduct, setRestockProduct] = useState<Product | null>(null)
  const [restockMode, setRestockMode] = useState<'tambah' | 'koreksi'>('tambah')
  const [restockQty, setRestockQty] = useState('')
  const [restockNote, setRestockNote] = useState('')
  const [restocking, setRestocking] = useState(false)
  const [restockDone, setRestockDone] = useState<string | null>(null)

  const loadProducts = () => {
    getLowStock
      .execute()
      .then(setProducts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat data.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const openRestock = (product: Product, mode: 'tambah' | 'koreksi' = 'tambah') => {
    setRestockProduct(product)
    setRestockMode(mode)
    setRestockQty('')
    setRestockNote('')
    setRestockDone(null)
  }

  const handleRestock = async () => {
    if (!restockProduct) return
    const qty = Math.floor(Number(restockQty))
    if (!Number.isFinite(qty) || qty <= 0) return

    if (restockMode === 'koreksi' && qty > restockProduct.stock) return

    setRestocking(true)
    try {
      const now = new Date().toISOString()
      const qtyBefore = restockProduct.stock
      const isTambah = restockMode === 'tambah'
      const qtyChange = isTambah ? qty : -qty
      const qtyAfter = qtyBefore + qtyChange
      await db.transaction('rw', [db.products, db.stockMovements], async () => {
        await db.products.update(restockProduct.id, {
          stock: qtyAfter,
          updatedAt: now,
          syncStatus: 'local_only' as const,
        })
        await db.stockMovements.add({
          id: generateId('sm'),
          productId: restockProduct.id,
          type: isTambah ? ('purchase' as const) : ('adjustment' as const),
          qtyChange,
          qtyBefore,
          qtyAfter,
          notes: restockNote.trim() || undefined,
          createdAt: now,
        })
      })
      loadProducts()
      setRestockDone(
        isTambah
          ? `Stok ${restockProduct.name} bertambah ${qty} → total ${qtyAfter} ${restockProduct.unit}`
          : `Stok ${restockProduct.name} dikoreksi −${qty} → total ${qtyAfter} ${restockProduct.unit}`
      )
      setRestockQty('')
      setRestockNote('')
      setTimeout(() => { setRestockProduct(null); setRestockDone(null) }, 2000)
    } finally {
      setRestocking(false)
    }
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <BackHeader to="/laporan" eyebrow="Laporan" title="Stok Menipis" icon="package" />

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
        <div className="rounded-md bg-danger-50 dark:bg-danger-700/20 px-3 py-2 text-sm text-danger-700 dark:text-danger-500">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-neutral-400 dark:text-dark-muted">Memuat stok menipis...</div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-dark-border dark:bg-dark-card">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-50 text-success-500 dark:bg-success-700/20 dark:text-success-300">
            <Icon name="check-circle" size={26} />
          </span>
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
                  <span className="font-semibold text-danger-700 dark:text-danger-500">
                    {p.stock} {p.unit}
                  </span>{' '}
                  · Min: {p.minStock} · {formatCurrency(p.sellPrice)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openRestock(p)}
                className="ml-3 shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-800 active:bg-primary-800"
              >
                + Restock
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* Restock Sheet */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={restocking ? undefined : () => setRestockProduct(null)}
          />
          <div data-bottom-sheet="true" className="relative w-full max-w-lg space-y-4 rounded-t-2xl bg-white dark:bg-dark-elevated p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-neutral-500 dark:text-dark-muted">Stok</p>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">{restockProduct.name}</h3>
              </div>
              {!restocking && (
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  data-android-back-close="true"
                  className="text-sm font-medium text-neutral-500 dark:text-dark-muted hover:text-neutral-800 dark:hover:text-white"
                >
                  Batal
                </button>
              )}
            </div>

            {/* Tab Tambah / Koreksi */}
            <div className="flex gap-1 rounded-xl bg-neutral-100 dark:bg-dark-card p-1">
              {(['tambah', 'koreksi'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setRestockMode(m); setRestockQty('') }}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                    restockMode === m
                      ? m === 'tambah'
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-warning-500 dark:bg-warning-600 text-white shadow-sm'
                      : 'text-neutral-500 dark:text-dark-muted hover:bg-neutral-200 dark:hover:bg-dark-elevated'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Icon name={m === 'tambah' ? 'plus' : 'edit'} size={14} />
                    {m === 'tambah' ? 'Tambah' : 'Koreksi'}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-dark-card px-4 py-3">
              <span className="text-sm text-neutral-500 dark:text-dark-muted">Stok saat ini</span>
              <span className="font-bold text-danger-700 dark:text-danger-500">
                {restockProduct.stock} {restockProduct.unit}
                {restockProduct.minStock > 0 && (
                  <span className="ml-1 font-normal text-neutral-400 dark:text-dark-muted">
                    (min {restockProduct.minStock})
                  </span>
                )}
              </span>
            </div>

            {restockMode === 'koreksi' && (
              <div className="flex items-start gap-2 rounded-xl bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:bg-warning-700/10 dark:text-warning-500">
                <Icon name="alert-triangle" size={14} className="mt-0.5 shrink-0" />
                <span>Koreksi mengurangi stok dan dicatat sebagai <strong>adjustment</strong> di histori.</span>
              </div>
            )}

            {restockDone ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-success-50 px-4 py-3 text-center text-sm font-semibold text-success-700 dark:bg-success-700/20 dark:text-success-400">
                <Icon name="check-circle" size={18} /> {restockDone}
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-dark-muted">
                    {restockMode === 'tambah' ? 'Jumlah Tambah *' : 'Jumlah Kurangi *'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    placeholder={`cth. 50 (${restockProduct.unit})`}
                    autoFocus
                    className="w-full rounded-md border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 font-mono text-sm text-neutral-900 dark:text-white focus:border-primary dark:focus:border-primary-400 focus:outline-none"
                  />
                  {restockMode === 'koreksi' && (() => {
                    const qty = Math.floor(Number(restockQty))
                    if (Number.isFinite(qty) && qty > 0 && qty > restockProduct.stock) {
                      return (
                        <p className="mt-1 text-xs text-danger-700 dark:text-danger-500">
                          Tidak bisa melebihi stok saat ini ({restockProduct.stock})
                        </p>
                      )
                    }
                    return null
                  })()}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-dark-muted">
                    Catatan (opsional)
                  </label>
                  <input
                    type="text"
                    value={restockNote}
                    onChange={(e) => setRestockNote(e.target.value)}
                    placeholder={restockMode === 'tambah' ? 'cth. Beli dari Toko ABC' : 'cth. Koreksi stok fisik'}
                    className="w-full rounded-md border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-primary dark:focus:border-primary-400 focus:outline-none"
                  />
                </div>
                {(() => {
                  const qty = Math.floor(Number(restockQty))
                  if (Number.isFinite(qty) && qty > 0) {
                    const isTambah = restockMode === 'tambah'
                    const after = isTambah ? restockProduct.stock + qty : restockProduct.stock - qty
                    if (restockMode === 'koreksi' && qty > restockProduct.stock) return null
                    return (
                      <p className="text-sm text-neutral-500 dark:text-dark-muted">
                        {isTambah ? 'Stok setelah tambah' : 'Stok setelah koreksi'}:{' '}
                        <strong className={`${isTambah ? 'text-neutral-900 dark:text-white' : 'text-warning-700 dark:text-warning-500'}`}>
                          {restockProduct.stock} {isTambah ? '+' : '−'} {qty} = {after} {restockProduct.unit}
                        </strong>
                      </p>
                    )
                  }
                  return null
                })()}
                <button
                  type="button"
                  onClick={() => void handleRestock()}
                  disabled={
                    restocking ||
                    !restockQty.trim() ||
                    Math.floor(Number(restockQty)) <= 0 ||
                    (restockMode === 'koreksi' && Math.floor(Number(restockQty)) > restockProduct.stock)
                  }
                  className={`w-full rounded-md px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                    restockMode === 'tambah'
                      ? 'bg-primary hover:bg-primary-800'
                      : 'bg-warning-600 hover:bg-warning-700'
                  }`}
                >
                  {restocking
                    ? 'Menyimpan...'
                    : restockMode === 'tambah'
                      ? 'Tambah Stok'
                      : 'Koreksi Stok'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
