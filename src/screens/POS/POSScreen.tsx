import { useEffect, useMemo, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { ReceiptPreview, type ReceiptPreviewItem } from '@/components/receipt/ReceiptPreview'
import { useProductStore } from '@/store/productStore'
import { useTransactionStore } from '@/store/transactionStore'
import type { Product, PaymentMethod, Transaction } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { downloadBlob } from '@/services/export/download'
import { getStoreProfile, type StoreProfile } from '@/lib/storeProfile'

interface CartItem {
  productId: string
  productName: string
  sku?: string
  price: number
  costPrice: number
  qty: number
  qtyInput: string
}

interface ReceiptSnapshot {
  transaction: Transaction
  items: ReceiptPreviewItem[]
  storeProfile: StoreProfile
  cashierName: string
}

const RECEIPT_ELEMENT_ID = 'aman-kasir-receipt-preview'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
  { value: 'transfer', label: 'Transfer' },
]

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
  piutang: 'Piutang',
  mixed: 'Campuran',
}

function normalizeQtyInput(value: string, fallback = 1): number {
  const parsed = Math.floor(Number(value))
  if (Number.isFinite(parsed) && parsed >= 1) return parsed
  return Math.max(1, fallback)
}

function normalizeCartItem(item: CartItem): CartItem {
  const qty = normalizeQtyInput(item.qtyInput, item.qty)
  return { ...item, qty, qtyInput: String(qty) }
}

function makeReceiptFilename(invoiceNo: string, extension: string): string {
  const safeInvoice = invoiceNo.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `struk-${safeInvoice}.${extension}`
}

function buildReceiptText(snapshot: ReceiptSnapshot): string {
  const { transaction, items, storeProfile, cashierName } = snapshot
  const date = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(transaction.date))

  const lines = [
    storeProfile.namaToko,
    storeProfile.alamat,
    storeProfile.nomorTelepon,
    '',
    `No: ${transaction.invoiceNo}`,
    `Tanggal: ${date}`,
    `Kasir: ${cashierName}`,
    '',
    ...items.flatMap((item) => [
      item.productName,
      `${item.qty} x ${formatCurrency(item.price)} = ${formatCurrency(item.subtotal)}`,
    ]),
    '',
    `Subtotal: ${formatCurrency(transaction.subtotal)}`,
    transaction.discount > 0 ? `Diskon: ${formatCurrency(transaction.discount)}` : '',
    transaction.tax > 0 ? `Pajak: ${formatCurrency(transaction.tax)}` : '',
    `Total: ${formatCurrency(transaction.total)}`,
    `Metode: ${PAYMENT_LABELS[transaction.paymentMethod]}`,
    `Bayar: ${formatCurrency(transaction.paidAmount)}`,
    transaction.changeAmount > 0 ? `Kembali: ${formatCurrency(transaction.changeAmount)}` : '',
    '',
    'Terima kasih telah berbelanja',
    'AMAN Kasir - Kasir yang Jalan Terus, Walau Sinyal Pergi',
  ]

  return lines.filter((line) => line !== '').join('\n')
}

function formatWhatsAppDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const dateText = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
  const timeText = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)

  return `${dateText}, ${timeText}`
}

function buildWhatsAppReceiptText(snapshot: ReceiptSnapshot): string {
  const { transaction, items, storeProfile, cashierName } = snapshot
  const lines: string[] = [`🧾 *${storeProfile.namaToko}*`]
  const address = storeProfile.alamat.trim()
  const phone = storeProfile.nomorTelepon.trim()

  if (address) lines.push(address)
  if (phone) lines.push(`Telp: ${phone}`)

  lines.push(
    '',
    `*No. Invoice:* ${transaction.invoiceNo}`,
    `*Tanggal:* ${formatWhatsAppDate(transaction.date)}`,
    `*Kasir:* ${cashierName || 'Kasir'}`,
    '',
    '*Detail Belanja*',
    '',
  )

  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.productName}`,
      `   Qty: ${item.qty} x ${formatCurrency(item.price)}`,
      `   Subtotal: ${formatCurrency(item.subtotal)}`,
      '',
    )
  })

  lines.push('---', `Subtotal: ${formatCurrency(transaction.subtotal)}`)

  if (transaction.discount > 0) {
    lines.push(`Diskon: ${formatCurrency(transaction.discount)}`)
  }
  if (transaction.tax > 0) {
    lines.push(`Pajak: ${formatCurrency(transaction.tax)}`)
  }

  lines.push(
    `*TOTAL: ${formatCurrency(transaction.total)}*`,
    '',
    `Metode Bayar: ${PAYMENT_LABELS[transaction.paymentMethod]}`,
  )

  if (transaction.paidAmount > 0) {
    lines.push(`Bayar: ${formatCurrency(transaction.paidAmount)}`)
  }
  if (transaction.changeAmount > 0) {
    lines.push(`Kembalian: ${formatCurrency(transaction.changeAmount)}`)
  }

  lines.push(
    '',
    'Terima kasih telah berbelanja 🙏',
    '',
    'AMAN Kasir',
    'Kasir yang Jalan Terus,',
    'Walau Sinyal Pergi',
  )

  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return entities[char] ?? char
  })
}

async function getReceiptCanvas(): Promise<HTMLCanvasElement> {
  const element = document.getElementById(RECEIPT_ELEMENT_ID)
  if (!element) {
    throw new Error('Preview struk tidak ditemukan.')
  }

  return html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
  })
}

interface ProductSearchBarProps {
  products: Product[]
  onSelect: (product: Product) => void
}

function ProductSearchBar({ products, onSelect }: ProductSearchBarProps) {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)),
      )
      .slice(0, 8)
  }, [products, query])

  useEffect(() => {
    setShowDropdown(results.length > 0)
  }, [results])

  const handleSelect = (product: Product) => {
    onSelect(product)
    setQuery('')
    setShowDropdown(false)
  }

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder="Cari produk atau scan barcode..."
        className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none"
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => handleSelect(p)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {p.sku}
                  {p.stock <= p.minStock && p.minStock > 0 ? (
                    <span className="ml-1 text-warning-700">- Stok menipis</span>
                  ) : (
                    ` - Stok: ${p.stock} ${p.unit}`
                  )}
                </p>
              </div>
              <p className="ml-3 flex-shrink-0 font-mono text-sm font-bold text-primary">
                {formatCurrency(p.sellPrice)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface CheckoutModalProps {
  cartTotal: number
  isSaving: boolean
  onClose: () => void
  onConfirm: (paymentMethod: PaymentMethod, paidAmount: number) => Promise<void>
}

function CheckoutModal({ cartTotal, isSaving, onClose, onConfirm }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paidAmountStr, setPaidAmountStr] = useState('')
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const paidAmount = Number(paidAmountStr) || 0
  const change = paidAmount - cartTotal
  const isCash = paymentMethod === 'cash'
  const canConfirm = !isSaving && (!isCash || paidAmount >= cartTotal)

  const handleConfirm = async () => {
    setCheckoutError(null)
    try {
      const finalPaid = isCash ? paidAmount : cartTotal
      await onConfirm(paymentMethod, finalPaid)
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={isSaving ? undefined : onClose} />
      <div className="relative w-full max-w-lg rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h3 className="font-bold text-neutral-900">Pembayaran</h3>
          {!isSaving && (
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
            >
              Batal
            </button>
          )}
        </div>

        <div className="space-y-4 p-5">
          {checkoutError && (
            <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {checkoutError}
            </div>
          )}

          <div className="rounded-lg bg-primary-50 px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase text-neutral-500">Total Tagihan</p>
            <p className="mt-1 font-mono text-3xl font-bold text-primary">
              {formatCurrency(cartTotal)}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-neutral-600">Metode Pembayaran</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m.value)
                    setPaidAmountStr('')
                  }}
                  className={`rounded-md border py-2.5 text-sm font-semibold transition-colors ${
                    paymentMethod === m.value
                      ? 'border-primary bg-primary text-white'
                      : 'border-neutral-300 text-neutral-700 hover:border-primary/50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {isCash && (
            <div>
              <p className="mb-1 text-xs font-semibold text-neutral-600">Uang Diterima</p>
              <input
                type="number"
                inputMode="numeric"
                value={paidAmountStr}
                onChange={(e) => setPaidAmountStr(e.target.value)}
                placeholder="Masukkan nominal..."
                min={cartTotal}
                autoFocus
                className="w-full rounded-md border border-neutral-300 px-3 py-3 font-mono text-lg font-bold focus:border-primary focus:outline-none"
              />
              {paidAmount > 0 && (
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-neutral-600">Kembalian</span>
                  <span
                    className={`font-mono font-bold ${
                      change >= 0 ? 'text-success-700' : 'text-danger-700'
                    }`}
                  >
                    {change >= 0 ? formatCurrency(change) : '-'}
                  </span>
                </div>
              )}
            </div>
          )}

          {!isCash && (
            <div className="rounded-md bg-neutral-100 px-3 py-2 text-center text-sm text-neutral-600">
              Pembayaran tepat sejumlah{' '}
              <span className="font-mono font-bold">{formatCurrency(cartTotal)}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full rounded-md bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-800 disabled:opacity-50"
          >
            {isSaving ? 'Menyimpan...' : 'Konfirmasi Pembayaran'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ReceiptSuccessSheetProps {
  snapshot: ReceiptSnapshot
  isBusy: boolean
  error: string | null
  onView: () => void
  onPrint: () => void
  onDownloadImage: () => void
  onDownloadPdf: () => void
  onWhatsApp: () => void
  onNewTransaction: () => void
}

function ReceiptSuccessSheet({
  snapshot,
  isBusy,
  error,
  onView,
  onPrint,
  onDownloadImage,
  onDownloadPdf,
  onWhatsApp,
  onNewTransaction,
}: ReceiptSuccessSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-neutral-50 sm:rounded-2xl">
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-success-700">
                Transaksi berhasil
              </p>
              <h3 className="mt-1 text-lg font-bold text-neutral-900">
                {snapshot.transaction.invoiceNo}
              </h3>
            </div>
            <button
              type="button"
              onClick={onNewTransaction}
              className="rounded-md border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Transaksi Baru
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <button
              type="button"
              onClick={onView}
              className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Struk
            </button>
            <button
              type="button"
              onClick={onWhatsApp}
              className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Print
            </button>
            <button
              type="button"
              onClick={onDownloadImage}
              disabled={isBusy}
              className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
            >
              JPG
            </button>
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={isBusy}
              className="rounded-md bg-primary px-3 py-3 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
            >
              PDF
            </button>
          </div>

          <div id={RECEIPT_ELEMENT_ID} className="bg-white py-4">
            <ReceiptPreview
              transaction={snapshot.transaction}
              items={snapshot.items}
              storeProfile={snapshot.storeProfile}
              cashierName={snapshot.cashierName}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function POSScreen() {
  const { products, loadProducts } = useProductStore()
  const { createTransaction } = useTransactionStore()

  const [cart, setCart] = useState<CartItem[]>([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [receiptSnapshot, setReceiptSnapshot] = useState<ReceiptSnapshot | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [isReceiptBusy, setIsReceiptBusy] = useState(false)

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        return prev.map((item) => {
          if (item.productId !== product.id) return item
          const qty = item.qty + 1
          return { ...item, qty, qtyInput: String(qty) }
        })
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          price: product.sellPrice,
          costPrice: product.costPrice,
          qty: 1,
          qtyInput: '1',
        },
      ]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item
        const qty = Math.max(1, item.qty + delta)
        return { ...item, qty, qtyInput: String(qty) }
      }),
    )
  }

  const setQtyInput = (productId: string, value: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item
        const parsed = Math.floor(Number(value))
        if (value !== '' && Number.isFinite(parsed) && parsed >= 1) {
          return { ...item, qty: parsed, qtyInput: value }
        }
        return { ...item, qtyInput: value }
      }),
    )
  }

  const commitQtyInput = (productId: string) => {
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? normalizeCartItem(item) : item)),
    )
  }

  const commitAllQtyInputs = () => {
    setCart((prev) => prev.map(normalizeCartItem))
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const clearCartSilently = () => {
    setCart([])
  }

  const clearCart = () => {
    if (cart.length === 0) return
    const confirmed = window.confirm('Kosongkan semua item di keranjang?')
    if (confirmed) {
      clearCartSilently()
    }
  }

  const openCheckout = () => {
    commitAllQtyInputs()
    setIsCheckoutOpen(true)
  }

  const handleCheckout = async (paymentMethod: PaymentMethod, paidAmount: number) => {
    setIsSaving(true)
    try {
      const normalizedCart = cart.map(normalizeCartItem)
      const finalTotal = normalizedCart.reduce((sum, item) => sum + item.price * item.qty, 0)
      const cartItems = normalizedCart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        qty: item.qty,
        price: item.price,
        costPrice: item.costPrice,
      }))

      const txn = await createTransaction(
        cartItems,
        finalTotal,
        finalTotal,
        paidAmount,
        paymentMethod,
      )

      const receiptItems: ReceiptPreviewItem[] = normalizedCart.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        qty: item.qty,
        price: item.price,
        discount: 0,
        subtotal: item.price * item.qty,
      }))

      setReceiptSnapshot({
        transaction: txn,
        items: receiptItems,
        storeProfile: getStoreProfile(),
        cashierName: 'Kasir',
      })
      setReceiptError(null)

      void loadProducts()

      const changeText =
        paymentMethod === 'cash' && txn.changeAmount > 0
          ? ` - Kembalian: ${formatCurrency(txn.changeAmount)}`
          : ''

      setSuccessMessage(`${txn.invoiceNo} berhasil disimpan!${changeText}`)
      clearCartSilently()
      setIsCheckoutOpen(false)
      setTimeout(() => setSuccessMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleViewReceipt = () => {
    document.getElementById(RECEIPT_ELEMENT_ID)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleDownloadReceiptImage = async () => {
    if (!receiptSnapshot) return
    setReceiptError(null)
    setIsReceiptBusy(true)
    try {
      const canvas = await getReceiptCanvas()
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (!result) {
              reject(new Error('Gagal membuat gambar struk.'))
              return
            }
            resolve(result)
          },
          'image/jpeg',
          0.92,
        )
      })
      downloadBlob(blob, makeReceiptFilename(receiptSnapshot.transaction.invoiceNo, 'jpg'))
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : 'Gagal download JPG struk.')
    } finally {
      setIsReceiptBusy(false)
    }
  }

  const handleDownloadReceiptPdf = async () => {
    if (!receiptSnapshot) return
    setReceiptError(null)
    setIsReceiptBusy(true)
    try {
      const canvas = await getReceiptCanvas()
      const image = canvas.toDataURL('image/jpeg', 0.92)
      const pdfWidth = 80
      const pdfHeight = Math.max(120, (canvas.height * pdfWidth) / canvas.width)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      })
      pdf.addImage(image, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(makeReceiptFilename(receiptSnapshot.transaction.invoiceNo, 'pdf'))
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : 'Gagal download PDF struk.')
    } finally {
      setIsReceiptBusy(false)
    }
  }

  const handlePrintReceipt = () => {
    if (!receiptSnapshot) return
    const popup = window.open('', '_blank', 'width=380,height=640')
    if (!popup) {
      setReceiptError('Popup print diblokir browser.')
      return
    }

    popup.document.write(`
      <html>
        <head>
          <title>${escapeHtml(receiptSnapshot.transaction.invoiceNo)}</title>
          <style>
            body { margin: 0; padding: 16px; font-family: "Roboto Mono", monospace; }
            pre { width: 80mm; max-width: 100%; white-space: pre-wrap; font-size: 12px; line-height: 1.55; }
            @media print { body { padding: 0; } pre { width: 80mm; } }
          </style>
        </head>
        <body>
          <pre>${escapeHtml(buildReceiptText(receiptSnapshot))}</pre>
        </body>
      </html>
    `)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  const handleWhatsAppReceipt = () => {
    if (!receiptSnapshot) return
    const text = encodeURIComponent(buildWhatsAppReceiptText(receiptSnapshot))
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="space-y-4 pb-24">
      <div>
        <p className="text-sm font-medium text-neutral-500">Kasir</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900">Transaksi Baru</h2>
      </div>

      {successMessage && (
        <div className="rounded-md bg-success-50 px-4 py-3 text-sm font-semibold text-success-700">
          {successMessage}
        </div>
      )}

      <ProductSearchBar products={products} onSelect={addToCart} />

      {cart.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 py-14 text-center">
          <p className="text-sm text-neutral-500">Belum ada produk di keranjang.</p>
          <p className="mt-1 text-xs text-neutral-400">
            Cari produk di atas untuk mulai transaksi.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="rounded-lg border border-neutral-200 bg-surface px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    {item.productName}
                  </p>
                  <p className="font-mono text-xs text-neutral-500">
                    {formatCurrency(item.price)}
                  </p>
                </div>

                <div className="min-w-[86px] text-right">
                  <p className="font-mono text-sm font-bold text-primary">
                    {formatCurrency(item.price * item.qty)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId)}
                    className="text-xs text-danger hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-neutral-500">Qty</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, -1)}
                    disabled={item.qty <= 1}
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-300 text-lg font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                    aria-label={`Kurangi qty ${item.productName}`}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={item.qtyInput}
                    onChange={(e) => setQtyInput(item.productId, e.target.value)}
                    onBlur={() => commitQtyInput(item.productId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur()
                      }
                    }}
                    aria-label={`Qty ${item.productName}`}
                    className="h-10 w-20 rounded-md border border-neutral-300 px-2 text-center font-mono text-base font-bold focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-lg font-bold text-white hover:bg-primary-800"
                    aria-label={`Tambah qty ${item.productName}`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-surface px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500">
                {cartCount} item - {cart.length} jenis
              </p>
              <p className="text-sm font-semibold text-neutral-700">Total</p>
            </div>
            <p className="font-mono text-2xl font-bold text-primary">{formatCurrency(cartTotal)}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={clearCart}
              className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              Kosongkan
            </button>
            <button
              type="button"
              onClick={openCheckout}
              className="flex-1 rounded-md bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-800"
            >
              Proses Pembayaran
            </button>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <CheckoutModal
          cartTotal={cartTotal}
          isSaving={isSaving}
          onClose={() => !isSaving && setIsCheckoutOpen(false)}
          onConfirm={handleCheckout}
        />
      )}

      {receiptSnapshot && (
        <ReceiptSuccessSheet
          snapshot={receiptSnapshot}
          isBusy={isReceiptBusy}
          error={receiptError}
          onView={handleViewReceipt}
          onPrint={handlePrintReceipt}
          onDownloadImage={() => void handleDownloadReceiptImage()}
          onDownloadPdf={() => void handleDownloadReceiptPdf()}
          onWhatsApp={handleWhatsAppReceipt}
          onNewTransaction={() => {
            setReceiptSnapshot(null)
            setReceiptError(null)
          }}
        />
      )}
    </section>
  )
}
