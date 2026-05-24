import { useEffect, useMemo, useRef, useState } from 'react'
import { ReceiptActionSheet } from '@/components/receipt/ReceiptActionSheet'
import type { ReceiptPreviewItem } from '@/components/receipt/ReceiptPreview'
import type { ReceiptSnapshot } from '@/components/receipt/receiptUtils'
import { useProductStore } from '@/store/productStore'
import { useTransactionStore } from '@/store/transactionStore'
import type { PaymentMethod, Product } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { getStoreProfile } from '@/lib/storeProfile'

interface CartItem {
  productId: string
  productName: string
  sku?: string
  price: number
  costPrice: number
  qty: number
  qtyInput: string
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
  { value: 'transfer', label: 'Transfer' },
]

function normalizeQtyInput(value: string, fallback = 1): number {
  const parsed = Math.floor(Number(value))
  if (Number.isFinite(parsed) && parsed >= 1) return parsed
  return Math.max(1, fallback)
}

function normalizeCartItem(item: CartItem): CartItem {
  const qty = normalizeQtyInput(item.qtyInput, item.qty)
  return { ...item, qty, qtyInput: String(qty) }
}

function toDateTimeLocalValue(date = new Date()): string {
  const pad = (value: number) => value.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

function dateTimeLocalToIso(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

interface ProductSearchBarProps {
  products: Product[]
  onSelect: (product: Product) => void
}

function ProductSearchBar({ products, onSelect }: ProductSearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [scanMessage, setScanMessage] = useState<string | null>(null)

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
    setScanMessage(`${product.name} ditambahkan.`)
  }

  const handleBarcodeSubmit = () => {
    const value = query.trim()
    if (!value) {
      inputRef.current?.focus()
      setScanMessage('Scan atau ketik barcode lalu tekan Enter.')
      return
    }

    const product = products.find((p) => p.barcode?.trim() === value)
    if (product) {
      handleSelect(product)
      return
    }

    setScanMessage('Barcode tidak ditemukan.')
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setScanMessage(null)
          }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleBarcodeSubmit()
            }
          }}
          placeholder="Cari produk atau scan barcode..."
          className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            inputRef.current?.focus()
            setScanMessage('Scanner USB/Bluetooth siap. Scan barcode ke kolom ini.')
          }}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
        >
          Scan Barcode
        </button>
      </div>

      {scanMessage && <p className="text-xs font-semibold text-neutral-500">{scanMessage}</p>}

      {showDropdown && (
        <div className="relative">
          <div className="absolute left-0 right-0 z-30 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
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
                    {p.barcode ? ` - ${p.barcode}` : ''}
                    {p.stock <= p.minStock && p.minStock > 0
                      ? ' - Stok menipis'
                      : ` - Stok: ${p.stock} ${p.unit}`}
                  </p>
                </div>
                <p className="ml-3 flex-shrink-0 font-mono text-sm font-bold text-primary">
                  {formatCurrency(p.sellPrice)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface CheckoutModalProps {
  cartTotal: number
  isSaving: boolean
  onClose: () => void
  onConfirm: (
    paymentMethod: PaymentMethod,
    paidAmount: number,
    transactionDate: string,
  ) => Promise<void>
}

function CheckoutModal({ cartTotal, isSaving, onClose, onConfirm }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paidAmountStr, setPaidAmountStr] = useState('')
  const [transactionDateLocal, setTransactionDateLocal] = useState(() => toDateTimeLocalValue())
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const paidAmount = Number(paidAmountStr) || 0
  const change = paidAmount - cartTotal
  const isCash = paymentMethod === 'cash'
  const canConfirm = !isSaving && (!isCash || paidAmount >= cartTotal)

  const handleConfirm = async () => {
    setCheckoutError(null)
    try {
      const finalPaid = isCash ? paidAmount : cartTotal
      await onConfirm(paymentMethod, finalPaid, dateTimeLocalToIso(transactionDateLocal))
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
              data-android-back-close="true"
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
            <p className="mb-1 text-xs font-semibold text-neutral-600">Tanggal Transaksi</p>
            <input
              type="datetime-local"
              value={transactionDateLocal}
              onChange={(e) => setTransactionDateLocal(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-3 text-sm font-semibold focus:border-primary focus:outline-none"
            />
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

export default function POSScreen() {
  const { products, loadProducts } = useProductStore()
  const { createTransaction } = useTransactionStore()

  const [cart, setCart] = useState<CartItem[]>([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [receiptSnapshot, setReceiptSnapshot] = useState<ReceiptSnapshot | null>(null)

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

  const handleCheckout = async (
    paymentMethod: PaymentMethod,
    paidAmount: number,
    transactionDate: string,
  ) => {
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
        undefined,
        transactionDate,
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
        <ReceiptActionSheet
          snapshot={receiptSnapshot}
          closeLabel="Transaksi Baru"
          onClose={() => setReceiptSnapshot(null)}
        />
      )}
    </section>
  )
}
