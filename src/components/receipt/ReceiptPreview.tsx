import type { Transaction, TransactionItem } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import type { StoreProfile } from '@/lib/storeProfile'

export type ReceiptPreviewItem = Pick<
  TransactionItem,
  'productName' | 'sku' | 'qty' | 'price' | 'discount' | 'subtotal'
>

interface ReceiptPreviewProps {
  transaction: Transaction
  items: ReceiptPreviewItem[]
  storeProfile: StoreProfile
  cashierName?: string
  id?: string
  className?: string
}

const receiptDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const paymentMethodLabels: Record<Transaction['paymentMethod'], string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
  piutang: 'Piutang',
  mixed: 'Campuran',
}

function formatReceiptDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return receiptDateFormatter.format(date)
}

export function ReceiptPreview({
  transaction,
  items,
  storeProfile,
  cashierName = 'Kasir',
  id,
  className = '',
}: ReceiptPreviewProps) {
  return (
    <article
      id={id}
      className={`mx-auto w-full max-w-[320px] bg-white px-4 py-4 font-mono text-[12px] leading-relaxed text-black shadow-sm ${className}`}
    >
      <header className="border-b border-dashed border-black pb-3 text-center">
        <h3 className="text-base font-bold">{storeProfile.namaToko}</h3>
        {storeProfile.alamat && <p className="mt-1 whitespace-pre-line">{storeProfile.alamat}</p>}
        {storeProfile.nomorTelepon && <p>{storeProfile.nomorTelepon}</p>}
      </header>

      <section className="border-b border-dashed border-black py-3">
        <div className="flex justify-between gap-3">
          <span>No</span>
          <span className="text-right font-bold">{transaction.invoiceNo}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Tanggal</span>
          <span className="text-right">{formatReceiptDate(transaction.date)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Kasir</span>
          <span className="text-right">{cashierName}</span>
        </div>
      </section>

      <section className="border-b border-dashed border-black py-3">
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${item.productName}-${index}`}>
              <div className="flex justify-between gap-3">
                <span className="font-bold">{item.productName}</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-3 text-[11px]">
                <span>
                  {item.qty} x {formatCurrency(item.price)}
                </span>
                {item.sku && <span>{item.sku}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-dashed border-black py-3">
        <div className="flex justify-between gap-3">
          <span>Subtotal</span>
          <span>{formatCurrency(transaction.subtotal)}</span>
        </div>
        {transaction.discount > 0 && (
          <div className="flex justify-between gap-3">
            <span>Diskon</span>
            <span>{formatCurrency(transaction.discount)}</span>
          </div>
        )}
        {transaction.tax > 0 && (
          <div className="flex justify-between gap-3">
            <span>Pajak</span>
            <span>{formatCurrency(transaction.tax)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between gap-3 text-sm font-bold">
          <span>Total</span>
          <span>{formatCurrency(transaction.total)}</span>
        </div>
      </section>

      <section className="border-b border-dashed border-black py-3">
        <div className="flex justify-between gap-3">
          <span>Metode</span>
          <span>{paymentMethodLabels[transaction.paymentMethod]}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Bayar</span>
          <span>{formatCurrency(transaction.paidAmount)}</span>
        </div>
        {transaction.changeAmount > 0 && (
          <div className="flex justify-between gap-3">
            <span>Kembali</span>
            <span>{formatCurrency(transaction.changeAmount)}</span>
          </div>
        )}
      </section>

      <footer className="pt-3 text-center">
        <p>Terima kasih telah berbelanja</p>
        <div className="mt-2 text-[11px] font-bold leading-snug">
          <p>AMAN Kasir</p>
          <p>Kasir yang Jalan Terus,</p>
          <p>Walau Sinyal Pergi</p>
        </div>
      </footer>
    </article>
  )
}
