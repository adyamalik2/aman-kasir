import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Customer, Transaction } from '@/domain'
import { db } from '@/infra/db/dexie'
import { formatCurrency } from '@/lib/currency'
import { ReceiptActionSheet } from '@/components/receipt/ReceiptActionSheet'
import type { ReceiptSnapshot } from '@/components/receipt/receiptUtils'
import { getStoreProfile } from '@/lib/storeProfile'
import { DexieTransactionRepository } from '@/repositories/implementations/DexieTransactionRepository'
import { Icon, BackHeader } from '@/components/ui'

const txnRepo = new DexieTransactionRepository()

// lunasAt/lunasMethod/lunasNotes sudah ada di domain Transaction
type PiutangTxn = Transaction

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
  piutang: 'Piutang',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CustomerDetailScreen() {
  const { id } = useParams<{ id: string }>()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [receiptSnapshot, setReceiptSnapshot] = useState<ReceiptSnapshot | null>(null)
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const run = async () => {
      try {
        const [cust, txns] = await Promise.all([
          db.customers.get(id),
          db.transactions
            .filter((t) => t.customerId === id)
            .toArray(),
        ])
        setCustomer(cust ?? null)
        // Sort by date desc
        setTransactions(txns.sort((a, b) => b.date.localeCompare(a.date)))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data.')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [id])

  const piutangTxns = transactions.filter((t) => t.paymentMethod === 'piutang') as PiutangTxn[]
  const belumLunas = piutangTxns.filter((t) => !t.lunasAt)
  const totalBelumLunas = belumLunas.reduce((s, t) => s + t.total, 0)
  const totalTransaksi = transactions.reduce((s, t) => s + t.total, 0)

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
        customerName: customer?.nama,
      })
    } finally {
      setLoadingReceiptId(null)
    }
  }

  return (
    <section className="space-y-4 pb-4">
      {/* Header */}
      <BackHeader to="/lainnya/pelanggan" eyebrow="Pelanggan" title="Detail Pelanggan" icon="user" />

      {error && (
        <div className="rounded-md bg-danger-50 dark:bg-danger-700/20 px-3 py-2 text-sm text-danger-700 dark:text-danger-500">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200 dark:bg-dark-border" />
          ))}
        </div>
      ) : !customer ? (
        <div className="flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-dark-border dark:bg-dark-card">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-dark-elevated">
            <Icon name="user" size={26} />
          </span>
          <p className="mt-2 text-sm font-semibold text-neutral-700 dark:text-white">Pelanggan tidak ditemukan</p>
        </div>
      ) : (
        <>
          {/* Info Pelanggan */}
          <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                <Icon name="user" size={24} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-neutral-900 dark:text-white">{customer.nama}</p>
                {customer.telepon && (
                  <p className="text-sm text-neutral-500 dark:text-dark-muted">{customer.telepon}</p>
                )}
              </div>
            </div>
            {customer.alamat && (
              <div className="flex items-start gap-2 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-dark-elevated">
                <Icon name="map-pin" size={14} className="mt-0.5 shrink-0 text-neutral-400" />
                <p className="text-xs text-neutral-500 dark:text-dark-muted">{customer.alamat}</p>
              </div>
            )}
            {customer.catatan && (
              <div className="flex items-start gap-2 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-dark-elevated">
                <Icon name="file-text" size={14} className="mt-0.5 shrink-0 text-neutral-400" />
                <p className="text-xs text-neutral-500 dark:text-dark-muted">{customer.catatan}</p>
              </div>
            )}
            <p className="text-xs text-neutral-400 dark:text-dark-muted">
              Pelanggan sejak {fmtDate(customer.createdAt)}
            </p>
          </div>

          {/* Ringkasan Statistik */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-3 text-center">
              <p className="font-mono text-lg font-bold text-neutral-900 dark:text-white">{transactions.length}</p>
              <p className="text-[10px] text-neutral-500 dark:text-dark-muted">Transaksi</p>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-3 text-center">
              <p className="font-mono text-sm font-bold text-primary truncate">{formatCurrency(totalTransaksi)}</p>
              <p className="text-[10px] text-neutral-500 dark:text-dark-muted">Total Belanja</p>
            </div>
            <div className={`rounded-xl border p-3 text-center ${
              totalBelumLunas > 0
                ? 'border-warning-200 dark:border-warning-700/40 bg-warning-50 dark:bg-warning-700/10'
                : 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card'
            }`}>
              <p className={`font-mono text-sm font-bold truncate ${
                totalBelumLunas > 0 ? 'text-warning-700 dark:text-warning-500' : 'text-neutral-900 dark:text-white'
              }`}>
                {formatCurrency(totalBelumLunas)}
              </p>
              <p className="text-[10px] text-neutral-500 dark:text-dark-muted">Piutang</p>
            </div>
          </div>

          {/* Piutang belum lunas */}
          {belumLunas.length > 0 && (
            <div className="rounded-xl border border-warning-200 dark:border-warning-700/40 bg-warning-50 dark:bg-warning-700/10 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-warning-700 dark:text-warning-500">
                <Icon name="alert-triangle" size={14} /> Piutang Belum Lunas ({belumLunas.length})
              </h3>
              <ul className="space-y-1.5">
                {belumLunas.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-neutral-700 dark:text-white font-medium">{t.invoiceNo}</span>
                    <span className="font-mono font-bold text-warning-700 dark:text-warning-500">
                      {formatCurrency(t.total)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/laporan/piutang"
                className="mt-3 block text-center text-xs font-semibold text-warning-700 dark:text-warning-500 underline"
              >
                Kelola piutang →
              </Link>
            </div>
          )}

          {/* Riwayat Transaksi */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">
              Riwayat Transaksi ({transactions.length})
            </h3>
            {transactions.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-6 text-center">
                <p className="text-sm text-neutral-400 dark:text-dark-muted">Belum ada transaksi.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {transactions.map((txn) => {
                  const pt = txn as PiutangTxn
                  return (
                    <li
                      key={txn.id}
                      className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-xs font-semibold text-neutral-500 dark:text-dark-muted">
                            {txn.invoiceNo}
                          </p>
                          <span className="rounded-full bg-neutral-100 dark:bg-dark-elevated px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:text-dark-muted">
                            {METHOD_LABELS[txn.paymentMethod] ?? txn.paymentMethod}
                          </span>
                          {txn.paymentMethod === 'piutang' && (
                            pt.lunasAt ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700 dark:bg-success-700/20 dark:text-success-400">
                                <Icon name="check" size={11} strokeWidth={2.5} /> Lunas
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-semibold text-warning-700 dark:bg-warning-700/20 dark:text-warning-500">
                                <Icon name="clock" size={11} /> Belum Lunas
                              </span>
                            )
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3">
                          <p className="font-mono text-sm font-bold text-primary">{formatCurrency(txn.total)}</p>
                          <p className="text-xs text-neutral-400 dark:text-dark-muted">{fmtDateTime(txn.date)}</p>
                        </div>
                        {txn.notes && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500 dark:text-dark-muted">
                            <Icon name="file-text" size={12} className="shrink-0" /> {txn.notes}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleOpenReceipt(txn)}
                        disabled={loadingReceiptId === txn.id}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary disabled:opacity-50 dark:bg-primary-900/30 dark:text-primary-400"
                        title="Lihat struk"
                      >
                        {loadingReceiptId === txn.id ? '…' : <Icon name="receipt" size={17} />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {receiptSnapshot && (
        <ReceiptActionSheet
          snapshot={receiptSnapshot}
          onClose={() => setReceiptSnapshot(null)}
        />
      )}
    </section>
  )
}
