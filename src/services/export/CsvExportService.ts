import type { Transaction, TransactionItem } from '@/domain'
import { downloadBlob } from './download'

function escapeCsvCell(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsvRow(cells: (string | number)[]): string {
  return cells.map(escapeCsvCell).join(',')
}

export class CsvExportService {
  /** Export daftar transaksi (satu baris per transaksi) */
  exportTransactions(transactions: Transaction[], filename = 'laporan-transaksi.csv'): void {
    const header = buildCsvRow([
      'No Invoice',
      'Tanggal',
      'Total',
      'Metode Bayar',
      'Status',
      'Subtotal',
      'Diskon',
      'Pajak',
    ])
    const rows = transactions.map((t) =>
      buildCsvRow([
        t.invoiceNo,
        t.date,
        t.total,
        t.paymentMethod,
        t.status,
        t.subtotal,
        t.discount,
        t.tax,
      ]),
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, filename)
  }

  /** Export item transaksi (satu baris per item) */
  exportTransactionItems(
    items: TransactionItem[],
    transactions: Transaction[],
    filename = 'laporan-item.csv',
  ): void {
    const txnMap = new Map(transactions.map((t) => [t.id, t]))
    const header = buildCsvRow([
      'No Invoice',
      'Tanggal',
      'Produk',
      'SKU',
      'Qty',
      'Harga',
      'Subtotal',
    ])
    const rows = items.map((item) => {
      const txn = txnMap.get(item.transactionId)
      return buildCsvRow([
        txn?.invoiceNo ?? '',
        txn?.date ?? '',
        item.productName,
        item.sku ?? '',
        item.qty,
        item.price,
        item.subtotal,
      ])
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, filename)
  }

  /** Export produk terlaris */
  exportTopProducts(
    rows: { productName: string; sku?: string; qtySold: number; revenue: number }[],
    filename = 'produk-terlaris.csv',
  ): void {
    const header = buildCsvRow(['Produk', 'SKU', 'Qty Terjual', 'Omzet'])
    const dataRows = rows.map((r) =>
      buildCsvRow([r.productName, r.sku ?? '', r.qtySold, r.revenue]),
    )
    const csv = [header, ...dataRows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, filename)
  }

  /** Export stok menipis */
  exportLowStock(
    products: { name: string; sku: string; stock: number; minStock: number; unit: string }[],
    filename = 'stok-menipis.csv',
  ): void {
    const header = buildCsvRow(['Produk', 'SKU', 'Stok', 'Stok Minimum', 'Satuan'])
    const dataRows = products.map((p) =>
      buildCsvRow([p.name, p.sku, p.stock, p.minStock, p.unit]),
    )
    const csv = [header, ...dataRows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, filename)
  }
}
