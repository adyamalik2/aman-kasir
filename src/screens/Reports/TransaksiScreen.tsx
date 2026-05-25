import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Transaction } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { db } from '@/infra/db/dexie'
import { DexieTransactionRepository } from '@/repositories/implementations/DexieTransactionRepository'
import { DexieProductRepository } from '@/repositories/implementations/DexieProductRepository'
import { DeleteTransactionUseCase } from '@/usecases/transaction/DeleteTransactionUseCase'
import { BulkDeleteTransactionsUseCase } from '@/usecases/transaction/BulkDeleteTransactionsUseCase'
import { ReceiptActionSheet } from '@/components/receipt/ReceiptActionSheet'
import type { ReceiptSnapshot } from '@/components/receipt/receiptUtils'
import { getStoreProfile } from '@/lib/storeProfile'
import { VerticalBarChart } from './components/VerticalBarChart'

// ---------------------------------------------------------------------------
// Use case & constants
// ---------------------------------------------------------------------------

const txnRepo = new DexieTransactionRepository()
const prodRepo = new DexieProductRepository()
const deleteUseCase = new DeleteTransactionUseCase(txnRepo, prodRepo)
const bulkDeleteUseCase = new BulkDeleteTransactionsUseCase(txnRepo, prodRepo)

const BULAN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const BULAN_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function fmtRupiah(v: number): string {
  if (v >= 1_000_000) return `${Math.round(v / 100_000) / 10}jt`
  if (v >= 1_000) return `${Math.round(v / 1_000)}rb`
  return String(Math.round(v))
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

// ---------------------------------------------------------------------------
// Tipe navigasi
// ---------------------------------------------------------------------------

type Metric = 'count' | 'pendapatan' | 'keuntungan'

interface AggRow {
  key: string          // year | month(0-based) | day
  label: string
  count: number
  pendapatan: number
  keuntungan: number
  txnIds: string[]
}

type View =
  | { type: 'menu' }
  | { type: 'years' }
  | { type: 'months'; year: number }
  | { type: 'days'; year: number; month: number }
  | { type: 'txns'; label: string; txnIds: string[] }

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

export default function TransaksiScreen() {
  const [searchParams] = useSearchParams()
  const didAutoNav = useRef(false)

  const [viewStack, setViewStack] = useState<View[]>([{ type: 'menu' }])
  const currentView = viewStack[viewStack.length - 1]

  // Data baku
  const [allTxns, setAllTxns] = useState<Transaction[]>([])
  const [profitMap, setProfitMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Chart metric
  const [metric, setMetric] = useState<Metric>('count')

  // Hapus satu transaksi
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [restoreStock, setRestoreStock] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Hapus bulk (per hari/bulan/tahun)
  const [bulkTarget, setBulkTarget] = useState<{ label: string; txnIds: string[] } | null>(null)
  const [bulkRestoreStock, setBulkRestoreStock] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Receipt
  const [receiptSnapshot, setReceiptSnapshot] = useState<ReceiptSnapshot | null>(null)
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null)

  // Navigasi
  const push = (v: View) => setViewStack((s) => [...s, v])
  const pop = useCallback(() => setViewStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), [])

  // Auto-navigate ke Hari Ini jika URL punya ?view=today
  useEffect(() => {
    if (didAutoNav.current) return
    if (searchParams.get('view') !== 'today') return
    didAutoNav.current = true

    const now = new Date()
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    setLoading(true)
    db.transactions
      .filter((t) => {
        const d = new Date(t.date)
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        return k === todayKey
      })
      .toArray()
      .then(async (txns) => {
        if (txns.length > 0) {
          const ids = txns.map((t) => t.id)
          const its = await db.transactionItems.where('transactionId').anyOf(ids).toArray()
          const pm = new Map<string, number>()
          for (const it of its) {
            pm.set(it.transactionId, (pm.get(it.transactionId) ?? 0) + (it.price - it.costPrice) * it.qty)
          }
          setAllTxns(txns)
          setProfitMap(pm)
        }
        push({ type: 'txns', label: 'Transaksi Hari Ini', txnIds: txns.map((t) => t.id) })
      })
      .catch(() => push({ type: 'txns', label: 'Transaksi Hari Ini', txnIds: [] }))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Load semua data saat pertama kali bukan 'menu'
  useEffect(() => {
    if (currentView.type === 'menu') return
    if (allTxns.length > 0) return  // sudah ada

    setLoading(true)
    setError(null)

    const run = async () => {
      const txns = await db.transactions.orderBy('date').reverse().toArray()
      const ids = txns.map((t) => t.id)
      const items = ids.length > 0
        ? await db.transactionItems.where('transactionId').anyOf(ids).toArray()
        : []

      // Build profit map per transaction
      const pMap = new Map<string, number>()
      for (const it of items) {
        pMap.set(it.transactionId, (pMap.get(it.transactionId) ?? 0) + (it.price - it.costPrice) * it.qty)
      }

      setAllTxns(txns)
      setProfitMap(pMap)
    }

    run()
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat data.'))
      .finally(() => setLoading(false))
  }, [currentView.type, allTxns.length])

  // ---------------------------------------------------------------------------
  // Agregasi helpers
  // ---------------------------------------------------------------------------

  function aggregateByYear(txns: Transaction[]): AggRow[] {
    const map = new Map<number, AggRow>()
    for (const t of txns) {
      const y = new Date(t.date).getFullYear()
      if (!map.has(y)) {
        map.set(y, { key: String(y), label: String(y), count: 0, pendapatan: 0, keuntungan: 0, txnIds: [] })
      }
      const row = map.get(y)!
      row.count++
      row.pendapatan += t.total
      row.keuntungan += profitMap.get(t.id) ?? 0
      row.txnIds.push(t.id)
    }
    return [...map.values()].sort((a, b) => Number(b.key) - Number(a.key))
  }

  function aggregateByMonth(txns: Transaction[]): AggRow[] {
    const map = new Map<string, AggRow>()
    for (const t of txns) {
      const d = new Date(t.date)
      const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
      if (!map.has(k)) {
        map.set(k, {
          key: String(d.getMonth()),
          label: BULAN_SHORT[d.getMonth()],
          count: 0, pendapatan: 0, keuntungan: 0, txnIds: [],
        })
      }
      const row = map.get(k)!
      row.count++
      row.pendapatan += t.total
      row.keuntungan += profitMap.get(t.id) ?? 0
      row.txnIds.push(t.id)
    }
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key))
  }

  function aggregateByDay(txns: Transaction[]): AggRow[] {
    const map = new Map<string, AggRow>()
    for (const t of txns) {
      const d = new Date(t.date)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          label: String(d.getDate()),
          count: 0, pendapatan: 0, keuntungan: 0, txnIds: [],
        })
      }
      const row = map.get(k)!
      row.count++
      row.pendapatan += t.total
      row.keuntungan += profitMap.get(t.id) ?? 0
      row.txnIds.push(t.id)
    }
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key))
  }

  function getMetricValue(row: AggRow): number {
    if (metric === 'count') return row.count
    if (metric === 'pendapatan') return row.pendapatan
    return row.keuntungan
  }

  // ---------------------------------------------------------------------------
  // Hapus transaksi
  // ---------------------------------------------------------------------------

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteUseCase.execute(deleteTarget.id, restoreStock)
      setAllTxns((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      setProfitMap((prev) => {
        const next = new Map(prev)
        next.delete(deleteTarget.id)
        return next
      })
      // Jika di view 'txns' dan sudah kosong, update txnIds
      if (currentView.type === 'txns') {
        const remaining = currentView.txnIds.filter((id) => id !== deleteTarget.id)
        if (remaining.length === 0) {
          pop()
        } else {
          setViewStack((s) => [
            ...s.slice(0, -1),
            { ...currentView, txnIds: remaining },
          ])
        }
      }
      setDeleteTarget(null)
      setRestoreStock(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus transaksi.')
    } finally {
      setDeleting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Hapus bulk
  // ---------------------------------------------------------------------------

  const handleBulkDelete = async () => {
    if (!bulkTarget) return
    setBulkDeleting(true)
    try {
      await bulkDeleteUseCase.execute(bulkTarget.txnIds, bulkRestoreStock)
      const deletedSet = new Set(bulkTarget.txnIds)
      setAllTxns((prev) => prev.filter((t) => !deletedSet.has(t.id)))
      setProfitMap((prev) => {
        const next = new Map(prev)
        for (const id of bulkTarget.txnIds) next.delete(id)
        return next
      })
      setBulkTarget(null)
      setBulkRestoreStock(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus transaksi.')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Buka struk
  // ---------------------------------------------------------------------------

  const handleOpenReceipt = async (txn: Transaction) => {
    setLoadingReceiptId(txn.id)
    try {
      const items = await txnRepo.getItemsByTransactionId(txn.id)
      setReceiptSnapshot({
        transaction: txn,
        items: items.map((item) => ({
          productName: item.productName,
          sku: item.sku,
          qty: item.qty,
          price: item.price,
          discount: item.discount,
          subtotal: item.subtotal,
        })),
        storeProfile: getStoreProfile(),
        cashierName: 'Kasir',
      })
    } finally {
      setLoadingReceiptId(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Render per view
  // ---------------------------------------------------------------------------

  function renderMenu() {
    const now = new Date()
    const items: { label: string; sub: string; onClick: () => void }[] = [
      {
        label: 'Hari Ini',
        sub: now.toLocaleDateString('id-ID', { dateStyle: 'long' }),
        onClick: () => {
          const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
          // Load fresh and push txns view
          setLoading(true)
          db.transactions
            .filter((t) => {
              const d = new Date(t.date)
              const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
              return k === todayKey
            })
            .toArray()
            .then(async (txns) => {
              if (allTxns.length === 0 && txns.length > 0) {
                // bootstrap profitMap for today's txns
                const ids = txns.map((t) => t.id)
                const its = await db.transactionItems.where('transactionId').anyOf(ids).toArray()
                const pm = new Map<string, number>(profitMap)
                for (const it of its) {
                  pm.set(it.transactionId, (pm.get(it.transactionId) ?? 0) + (it.price - it.costPrice) * it.qty)
                }
                setAllTxns((prev) => {
                  const ids = new Set(prev.map((t) => t.id))
                  return [...prev, ...txns.filter((t) => !ids.has(t.id))]
                })
                setProfitMap(pm)
              }
              push({ type: 'txns', label: 'Transaksi Hari Ini', txnIds: txns.map((t) => t.id) })
            })
            .catch(() => {
              push({ type: 'txns', label: 'Transaksi Hari Ini', txnIds: [] })
            })
            .finally(() => setLoading(false))
        },
      },
      {
        label: 'Bulan Ini',
        sub: `${BULAN_FULL[now.getMonth()]} ${now.getFullYear()}`,
        onClick: () => push({ type: 'days', year: now.getFullYear(), month: now.getMonth() }),
      },
      {
        label: 'Tahun Ini',
        sub: String(now.getFullYear()),
        onClick: () => push({ type: 'months', year: now.getFullYear() }),
      },
      {
        label: 'Semua Transaksi',
        sub: 'Semua riwayat',
        onClick: () => push({ type: 'years' }),
      },
    ]

    return (
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={item.onClick}
              className="flex w-full items-center justify-between rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card px-4 py-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-dark-elevated active:bg-neutral-100 dark:active:bg-dark-elevated"
            >
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">{item.label}</p>
                <p className="mt-0.5 text-xs text-neutral-400 dark:text-dark-muted">{item.sub}</p>
              </div>
              <span className="text-xl text-neutral-300 dark:text-dark-border">›</span>
            </button>
          </li>
        ))}
      </ul>
    )
  }

  function renderAggView(
    rows: AggRow[],
    onRowClick: (row: AggRow) => void,
    getDeleteLabel: (row: AggRow) => string,
  ) {
    const chartData = [...rows]
      .reverse()
      .slice(-12)
      .map((r) => ({ label: r.label, value: getMetricValue(r) }))

    return (
      <div className="space-y-4">
        {/* Chart */}
        <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-4">
          <MetricTabs metric={metric} onChange={setMetric} />
          <VerticalBarChart
            data={chartData}
            height={150}
            formatValue={metric === 'count' ? undefined : fmtRupiah}
            emptyText="Belum ada data"
          />
        </div>

        {/* List */}
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.key}
                className="flex overflow-hidden rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card"
              >
                {/* Area klik → drill down */}
                <button
                  type="button"
                  onClick={() => onRowClick(row)}
                  className="flex flex-1 items-center justify-between px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-dark-elevated active:bg-neutral-100 dark:active:bg-dark-elevated"
                >
                  <div>
                    <p className="text-base font-bold text-neutral-900 dark:text-white">{row.label}</p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-dark-muted">{row.count} transaksi</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-neutral-900 dark:text-white">
                        {formatCurrency(row.pendapatan)}
                      </p>
                      <p className="font-mono text-xs text-success-700">
                        +{formatCurrency(row.keuntungan)}
                      </p>
                    </div>
                    <span className="text-xl text-neutral-300 dark:text-dark-border">›</span>
                  </div>
                </button>

                {/* Tombol hapus bulk */}
                <button
                  type="button"
                  onClick={() =>
                    setBulkTarget({ label: getDeleteLabel(row), txnIds: row.txnIds })
                  }
                  className="flex shrink-0 items-center border-l border-neutral-100 dark:border-dark-border px-4 text-xl text-danger-300 dark:text-danger-700 transition-colors hover:bg-danger-50 dark:hover:bg-danger-700/20 hover:text-danger-600 dark:hover:text-danger-400 active:bg-danger-100 dark:active:bg-danger-700/30"
                  title={`Hapus ${row.count} transaksi`}
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  function renderTxnsList(txnIds: string[]) {
    const txns = allTxns.filter((t) => txnIds.includes(t.id))

    return txns.length === 0 ? (
      <EmptyState />
    ) : (
      <ul className="space-y-2">
        {txns.map((txn) => {
          const profit = profitMap.get(txn.id) ?? 0
          return (
            <li
              key={txn.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card px-4 py-3"
            >
              {/* Waktu */}
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-bold text-neutral-900 dark:text-white">{fmtTime(txn.date)}</p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-dark-muted">{txn.invoiceNo}</p>
                <div className="mt-1 flex gap-3">
                  <span className="font-mono text-xs text-neutral-700 dark:text-dark-muted">
                    {formatCurrency(txn.total)}
                  </span>
                  <span className="font-mono text-xs text-success-700">
                    +{formatCurrency(profit)}
                  </span>
                </div>
              </div>

              {/* Aksi */}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleOpenReceipt(txn)}
                  disabled={loadingReceiptId === txn.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary dark:text-primary-400 disabled:opacity-50"
                  title="Lihat struk"
                >
                  {loadingReceiptId === txn.id ? '…' : '🧾'}
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteTarget(txn); setRestoreStock(false) }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-50 text-danger-700"
                  title="Hapus transaksi"
                >
                  🗑
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  // ---------------------------------------------------------------------------
  // Build content
  // ---------------------------------------------------------------------------

  let title = 'Laporan Transaksi'
  let content: React.ReactNode = null

  if (currentView.type === 'menu') {
    title = 'Laporan Transaksi'
    content = loading ? (
      <div className="py-12 text-center text-sm text-neutral-400">Memuat...</div>
    ) : renderMenu()

  } else if (currentView.type === 'years') {
    title = 'Semua Transaksi'
    const rows = aggregateByYear(allTxns)
    content = loading ? (
      <div className="py-12 text-center text-sm text-neutral-400">Memuat data...</div>
    ) : renderAggView(
        rows,
        (row) => { push({ type: 'months', year: Number(row.key) }) },
        (row) => `Tahun ${row.label}`,
      )

  } else if (currentView.type === 'months') {
    const { year } = currentView
    title = String(year)
    const filtered = allTxns.filter((t) => new Date(t.date).getFullYear() === year)
    const rows = aggregateByMonth(filtered)
    content = loading ? (
      <div className="py-12 text-center text-sm text-neutral-400">Memuat data...</div>
    ) : renderAggView(
        rows,
        (row) => { push({ type: 'days', year, month: Number(row.key) }) },
        (row) => `${BULAN_FULL[Number(row.key)] ?? row.label} ${year}`,
      )

  } else if (currentView.type === 'days') {
    const { year, month } = currentView
    title = `${BULAN_FULL[month]} ${year}`
    const filtered = allTxns.filter((t) => {
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    const rows = aggregateByDay(filtered)
    content = loading ? (
      <div className="py-12 text-center text-sm text-neutral-400">Memuat data...</div>
    ) : renderAggView(
        rows,
        (row) => { push({ type: 'txns', label: `${row.label} ${BULAN_SHORT[month]} ${year}`, txnIds: row.txnIds }) },
        (row) => `${row.label} ${BULAN_FULL[month]} ${year}`,
      )

  } else if (currentView.type === 'txns') {
    title = currentView.label
    content = loading ? (
      <div className="py-12 text-center text-sm text-neutral-400">Memuat transaksi...</div>
    ) : renderTxnsList(currentView.txnIds)
  }

  const canGoBack = viewStack.length > 1

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {canGoBack ? (
          <button
            type="button"
            onClick={pop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-dark-elevated active:bg-neutral-200 dark:active:bg-dark-border"
          >
            <span className="text-xl text-primary">‹</span>
          </button>
        ) : (
          <Link
            to="/laporan"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-dark-elevated active:bg-neutral-200 dark:active:bg-dark-border"
          >
            <span className="text-xl text-primary">‹</span>
          </Link>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">Laporan</p>
          <h2 className="truncate text-lg font-bold text-neutral-900 dark:text-white">{title}</h2>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
      )}

      {content}

      {/* Dialog hapus transaksi */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white dark:bg-dark-elevated p-6 sm:rounded-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Hapus Transaksi?</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-dark-muted">
              {deleteTarget.invoiceNo} · {formatCurrency(deleteTarget.total)}
            </p>
            <p className="mt-2 text-xs text-danger-700">
              ⚠️ Transaksi yang dihapus tidak dapat dikembalikan.
            </p>

            {/* Checkbox restore stok */}
            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={restoreStock}
                onChange={(e) => setRestoreStock(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span className="text-sm text-neutral-700 dark:text-white">
                Kembalikan stok barang ke gudang
                <span className="mt-0.5 block text-xs text-neutral-400 dark:text-dark-muted">
                  Stok tiap produk dalam transaksi ini akan ditambah kembali
                </span>
              </span>
            </label>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="w-full rounded-lg bg-danger-600 py-3 text-sm font-bold text-white active:bg-danger-700 disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : '🗑 Ya, Hapus Transaksi Ini'}
              </button>
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setRestoreStock(false) }}
                disabled={deleting}
                className="w-full rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated py-3 text-sm font-semibold text-neutral-600 dark:text-dark-muted disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog hapus bulk */}
      {bulkTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white dark:bg-dark-elevated p-6 sm:rounded-2xl">
            <h3 className="text-base font-bold text-neutral-900">Hapus {bulkTarget.label}?</h3>
            <p className="mt-1 text-sm text-neutral-600">
              <span className="font-bold text-danger-700">{bulkTarget.txnIds.length} transaksi</span>{' '}
              akan dihapus permanen.
            </p>
            <p className="mt-2 text-xs text-danger-700">
              ⚠️ Tindakan ini tidak dapat dibatalkan.
            </p>

            {/* Checkbox restore stok */}
            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={bulkRestoreStock}
                onChange={(e) => setBulkRestoreStock(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span className="text-sm text-neutral-700 dark:text-white">
                Kembalikan stok semua barang ke gudang
                <span className="mt-0.5 block text-xs text-neutral-400 dark:text-dark-muted">
                  Stok tiap produk dari {bulkTarget.txnIds.length} transaksi akan ditambah kembali
                </span>
              </span>
            </label>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => void handleBulkDelete()}
                disabled={bulkDeleting}
                className="w-full rounded-lg bg-danger-600 py-3 text-sm font-bold text-white active:bg-danger-700 disabled:opacity-50"
              >
                {bulkDeleting
                  ? 'Menghapus...'
                  : `🗑 Ya, Hapus ${bulkTarget.txnIds.length} Transaksi`}
              </button>
              <button
                type="button"
                onClick={() => { setBulkTarget(null); setBulkRestoreStock(false) }}
                disabled={bulkDeleting}
                className="w-full rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated py-3 text-sm font-semibold text-neutral-600 dark:text-dark-muted disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt sheet */}
      {receiptSnapshot && (
        <ReceiptActionSheet
          snapshot={receiptSnapshot}
          onClose={() => setReceiptSnapshot(null)}
        />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Sub-komponen
// ---------------------------------------------------------------------------

function MetricTabs({ metric, onChange }: { metric: Metric; onChange: (m: Metric) => void }) {
  const options: { value: Metric; label: string }[] = [
    { value: 'count', label: 'Jml Transaksi' },
    { value: 'pendapatan', label: 'Pendapatan' },
    { value: 'keuntungan', label: 'Keuntungan' },
  ]
  return (
    <div className="mb-3 flex gap-1 overflow-x-auto">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            metric === o.value ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-dark-elevated text-neutral-600 dark:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-8 text-center">
      <p className="text-sm text-neutral-400 dark:text-dark-muted">Belum ada transaksi pada periode ini.</p>
    </div>
  )
}
