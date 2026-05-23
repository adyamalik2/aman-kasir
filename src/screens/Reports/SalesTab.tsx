import { useState, useEffect } from 'react'
import { useTransactionStore } from '@/store/transactionStore'
import type { PaymentMethod, TransactionStatus } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { CsvExportService } from '@/services/export/CsvExportService'
import { PdfExportService } from '@/services/export/PdfExportService'
import { useAppStore } from '@/store/appStore'
import { ReceiptActionSheet } from '@/components/receipt/ReceiptActionSheet'
import type { ReceiptSnapshot } from '@/components/receipt/receiptUtils'
import { getStoreProfile } from '@/lib/storeProfile'
import ExportButtons, { ExportButton } from './ExportButtons'
import { exportTransactionItems } from './reportApi'

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
  return `${formatDate(d)}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
}

const csvService = new CsvExportService()
const pdfService = new PdfExportService()

export default function SalesTab() {
  const { transactions, transactionItems, isLoading, error, loadTransactions, loadTransactionItems } =
    useTransactionStore()
  const storeName = useAppStore((s) => s.storeName)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingItems, setLoadingItems] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [receiptSnapshot, setReceiptSnapshot] = useState<ReceiptSnapshot | null>(null)

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

  const handleExportCsv = () => {
    csvService.exportTransactions(transactions)
  }

  const handleExportPdf = () => {
    pdfService.exportTransactions(transactions, {
      storeName,
      periodLabel: 'Riwayat semua transaksi',
    })
  }

  const handleExportAllItems = async () => {
    setExporting(true)
    try {
      const ids = transactions.map((t) => t.id)
      const items = await exportTransactionItems.execute(ids)
      csvService.exportTransactionItems(items, transactions, 'laporan-detail-item.csv')
    } finally {
      setExporting(false)
    }
  }

  const handleOpenReceipt = async (id: string) => {
    const txn = transactions.find((t) => t.id === id)
    if (!txn) return

    setLoadingItems(id)
    try {
      const items = transactionItems[id] ?? (await loadTransactionItems(id))
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
      setLoadingItems(null)
    }
  }

  return (
    <div className="space-y-4">
      <ExportButtons>
        <ExportButton label="Export CSV" onClick={handleExportCsv} disabled={transactions.length === 0} />
        <ExportButton label="Export PDF" onClick={handleExportPdf} disabled={transactions.length === 0} />
      </ExportButtons>

      {error && (
        <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-neutral-500">Memuat riwayat...</div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-surface p-8 text-center">
          <p className="text-sm text-neutral-500">Belum ada transaksi yang tercatat.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {transactions.map((txn) => {
            const isExpanded = expandedId === txn.id
            const items = transactionItems[txn.id]
            return (
              <li key={txn.id} className="overflow-hidden rounded-lg border border-neutral-200 bg-surface">
                <button
                  type="button"
                  onClick={() => handleToggle(txn.id)}
                  className="flex w-full items-start justify-between p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-bold text-neutral-900">{txn.invoiceNo}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[txn.status]}`}>
                        {STATUS_LABEL[txn.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {formatDateTime(txn.date)} · {PAYMENT_LABEL[txn.paymentMethod]}
                    </p>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1">
                    <p className="font-mono text-base font-bold text-primary">{formatCurrency(txn.total)}</p>
                    <span className="text-xs text-neutral-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-neutral-100 bg-neutral-50 px-4 pb-4 pt-3">
                    {loadingItems === txn.id ? (
                      <p className="py-2 text-center text-xs text-neutral-400">Memuat item...</p>
                    ) : items && items.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs font-semibold text-neutral-500">
                            <th className="pb-1 text-left">Produk</th>
                            <th className="pb-1 text-right">Qty</th>
                            <th className="pb-1 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-1.5">{item.productName}</td>
                              <td className="py-1.5 text-right font-mono">{item.qty}×</td>
                              <td className="py-1.5 text-right font-mono">{formatCurrency(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="py-2 text-center text-xs text-neutral-400">Tidak ada item.</p>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      <button
                        type="button"
                        onClick={() => void handleOpenReceipt(txn.id)}
                        disabled={loadingItems === txn.id}
                        className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-60"
                      >
                        Lihat Struk
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleOpenReceipt(txn.id)}
                        disabled={loadingItems === txn.id}
                        className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                      >
                        Print/JPG/PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleOpenReceipt(txn.id)}
                        disabled={loadingItems === txn.id}
                        className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                      >
                        WhatsApp/Share
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!isLoading && transactions.length > 0 && (
        <p className="text-center text-xs text-neutral-400">
          {transactions.length} transaksi ·{' '}
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExportAllItems()}
            className="text-primary underline disabled:opacity-50"
          >
            Export detail item CSV
          </button>
        </p>
      )}

      {receiptSnapshot && (
        <ReceiptActionSheet
          snapshot={receiptSnapshot}
          onClose={() => setReceiptSnapshot(null)}
        />
      )}
    </div>
  )
}
