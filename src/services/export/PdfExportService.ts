import { jsPDF } from 'jspdf'
import type { Transaction } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'

const PAYMENT_LABEL: Record<Transaction['paymentMethod'], string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
  piutang: 'Piutang',
  mixed: 'Campuran',
}

export interface PdfExportOptions {
  storeName?: string
  periodLabel?: string
}

export class PdfExportService {
  exportTransactions(
    transactions: Transaction[],
    options: PdfExportOptions = {},
  ): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const storeName = options.storeName ?? 'AMAN Kasir'
    const periodLabel = options.periodLabel ?? 'Semua periode'
    const margin = 14
    let y = margin

    doc.setFontSize(16)
    doc.text(storeName, margin, y)
    y += 8

    doc.setFontSize(11)
    doc.text('Laporan Transaksi', margin, y)
    y += 6
    doc.setFontSize(9)
    doc.text(`Periode: ${periodLabel}`, margin, y)
    y += 5
    doc.text(`Dicetak: ${formatDate(new Date())}`, margin, y)
    y += 10

    doc.setFontSize(8)
    const colX = [margin, 48, 95, 125, 155]
    const headers = ['Invoice', 'Tanggal', 'Total', 'Bayar', 'Status']
    headers.forEach((h, i) => doc.text(h, colX[i] ?? margin, y))
    y += 5

    doc.setDrawColor(200)
    doc.line(margin, y, 196, y)
    y += 4

    for (const txn of transactions) {
      if (y > 270) {
        doc.addPage()
        y = margin
      }
      const dateStr = formatDate(txn.date)
      doc.text(txn.invoiceNo.slice(0, 18), colX[0] ?? margin, y)
      doc.text(dateStr.slice(0, 12), colX[1] ?? margin, y)
      doc.text(formatCurrency(txn.total).replace('Rp', ''), colX[2] ?? margin, y)
      doc.text(PAYMENT_LABEL[txn.paymentMethod], colX[3] ?? margin, y)
      doc.text(txn.status, colX[4] ?? margin, y)
      y += 5
    }

    y += 6
    const totalOmzet = transactions.reduce((s, t) => s + t.total, 0)
    doc.setFontSize(9)
    doc.text(`Total transaksi: ${transactions.length}`, margin, y)
    y += 5
    doc.text(`Total omzet: ${formatCurrency(totalOmzet)}`, margin, y)

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.text(`AMAN Kasir — Halaman ${i}/${pageCount}`, margin, 287)
    }

    doc.save(`laporan-transaksi-${new Date().toISOString().slice(0, 10)}.pdf`)
  }
}
