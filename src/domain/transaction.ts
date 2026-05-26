import type { BaseSyncFields } from './sync'

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'piutang' | 'mixed'

export type TransactionStatus = 'completed' | 'voided' | 'refunded'

export interface Transaction extends BaseSyncFields {
  invoiceNo: string
  date: string
  cashierId?: string
  customerId?: string
  subtotal: number
  discount: number
  tax: number
  total: number
  paidAmount: number
  changeAmount: number
  paymentMethod: PaymentMethod
  status: TransactionStatus
  notes?: string
  /** Waktu pelunasan piutang (ISO string) — diisi saat tandai lunas */
  lunasAt?: string
  /** Metode pembayaran saat piutang dilunasi */
  lunasMethod?: string
  /** Catatan saat piutang dilunasi */
  lunasNotes?: string
}

export interface TransactionItem {
  id: string
  transactionId: string
  productId: string
  productName: string
  sku?: string
  qty: number
  price: number
  costPrice: number
  discount: number
  subtotal: number
}
