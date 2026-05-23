import { useState, useEffect } from 'react'
import { useTransactionStore } from '@/store/transactionStore'
import type { PaymentMethod, TransactionStatus } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
  piutang: 'Piutang',
  mixed: 'Campuran',
}

const STATUS_LABEL: Record<TransactionStatus, string> = {
  completed: 'Selesai',
  voided: 'Dibatalkan',
  refunded: 'Dikembalikan',
}

const STATUS_COLOR: Record<TransactionStatus, string> = {
  completed: 'bg-success-50 text-success-700',
  voided: 'bg-danger-50 text-danger-700',
  refunded: 'bg-warning-50 text-warning-700',
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const date = formatDate(d)
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
}

// ---------------------------------------------------------------------------
// ReportsScreen
// ---------------------------------------------------------------------------

export default function ReportsScreen() {
  const { transactions, transactionItems, isLoading, error, loadTransactions, loadTransactionItems } =
    useTransactionStore()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingItems, setLoadingItems] = useState<string | null>(null)

  useEffect(() => {
    void loadTransactions()
  }, [loadTransactions])

  const handleToggle = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!transactionItems[id]) {
      setLoadingItems(id)
      try {
        await loadTransactionItems(id)
      } finally {
        setLoadingItems(null)
      }
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium text-neutral-500">Laporan</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900">Riwayat Transaksi</h2>
      </div>

      {error && (
        <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-neutral-500">Memuat riwayat...</div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-surface p-8 text-center">
          <p className="text-sm text-neutral-500">Belum ada transaksi yang tercatat.</p>
          <p className="mt-1 text-xs text-neutral-400">
            Mulai transaksi di halaman Kasir untuk melihat riwayat di sini.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {transactions.map((txn) => {
            const isExpanded = expandedId === txn.id
            const items = transactionItems[txn.id]
            const isLoadingThis = loadingItems === txn.id

            return (
              <li key={txn.id} className="overflow-hidden rounded-lg border border-neutral-200 bg-surface">
                {/* Transaction header */}
                <button
                  type="button"
                  onClick={() => handleToggle(txn.id)}
                  className="flex w-full items-start justify-between p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-sm font-bold text-neutral-900">{txn.invoiceNo}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[txn.status]}`}
                      >
                        {STATUS_LABEL[txn.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {formatDateTime(txn.date)} · {PAYMENT_LABEL[txn.paymentMethod]}
                    </p>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1">
                    <p className="font-mono text-base font-bold text-primary">
                      {formatCurrency(txn.total)}
                    </p>
                    <span className="text-xs text-neutral-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Expanded items */}
                {isExpanded && (
                  <div className="border-t border-neutral-100 bg-neutral-50 px-4 pb-4 pt-3">
                    {isLoadingThis ? (
                      <p className="py-2 text-center text-xs text-neutral-400">Memuat item...</p>
                    ) : items && items.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs font-semibold text-neutral-500">
                            <th className="pb-1 text-left">Produk</th>
                            <th className="pb-1 text-right">Qty</th>
                            <th className="pb-1 text-right">Harga</th>
                            <th className="pb-1 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-1.5 pr-2">
                                <p className="font-medium text-neutral-900">{item.productName}</p>
                                {item.sku && (
                                  <p className="text-xs text-neutral-400">{item.sku}</p>
                                )}
                              </td>
                              <td className="py-1.5 text-right font-mono text-neutral-700">
                                {item.qty}×
                              </td>
                              <td className="py-1.5 pl-2 text-right font-mono text-neutral-700">
                                {formatCurrency(item.price)}
                              </td>
                              <td className="py-1.5 pl-2 text-right font-mono font-semibold text-neutral-900">
                                {formatCurrency(item.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-neutral-200">
                            <td
                              colSpan={3}
                              className="pt-2 text-xs font-semibold uppercase text-neutral-500"
                            >
                              Total
                            </td>
                            <td className="pt-2 text-right font-mono font-bold text-primary">
                              {formatCurrency(txn.total)}
                            </td>
                          </tr>
                          {txn.paymentMethod === 'cash' && txn.changeAmount > 0 && (
                            <tr>
                              <td
                                colSpan={3}
                                className="pb-1 text-xs text-neutral-500"
                              >
                                Kembalian
                              </td>
                              <td className="pb-1 text-right font-mono text-sm text-neutral-600">
                                {formatCurrency(txn.changeAmount)}
                              </td>
                            </tr>
                          )}
                        </tfoot>
                      </table>
                    ) : (
                      <p className="py-2 text-center text-xs text-neutral-400">
                        Tidak ada item ditemukan.
                      </p>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!isLoading && transactions.length > 0 && (
        <p className="text-center text-xs text-neutral-400">
          {transactions.length} transaksi ditampilkan
        </p>
      )}
    </section>
  )
}
