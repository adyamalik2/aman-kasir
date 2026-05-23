import { useState, useEffect, useMemo } from 'react'
import { useProductStore } from '@/store/productStore'
import { useTransactionStore } from '@/store/transactionStore'
import type { Product, PaymentMethod } from '@/domain'
import { formatCurrency } from '@/lib/currency'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CartItem {
  productId: string
  productName: string
  sku?: string
  price: number
  costPrice: number
  qty: number
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
  { value: 'transfer', label: 'Transfer' },
]

// ---------------------------------------------------------------------------
// ProductSearchBar
// ---------------------------------------------------------------------------

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
        className="w-full rounded-lg border border-neutral-200 bg-white py-3 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
        🔍
      </span>

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
                    <span className="ml-1 text-warning-700">· Stok menipis</span>
                  ) : (
                    ` · Stok: ${p.stock} ${p.unit}`
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

// ---------------------------------------------------------------------------
// CheckoutModal
// ---------------------------------------------------------------------------

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
      <div
        className="absolute inset-0 bg-black/40"
        onClick={isSaving ? undefined : onClose}
      />
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

          {/* Total */}
          <div className="rounded-lg bg-primary-50 px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase text-neutral-500">Total Tagihan</p>
            <p className="mt-1 font-mono text-3xl font-bold text-primary">
              {formatCurrency(cartTotal)}
            </p>
          </div>

          {/* Payment method */}
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

          {/* Cash: paid amount input */}
          {isCash && (
            <div>
              <p className="mb-1 text-xs font-semibold text-neutral-600">Uang Diterima</p>
              <input
                type="number"
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
                    className={`font-mono font-bold ${change >= 0 ? 'text-success-700' : 'text-danger-700'}`}
                  >
                    {change >= 0 ? formatCurrency(change) : '—'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Non-cash: exact payment notice */}
          {!isCash && (
            <div className="rounded-md bg-neutral-100 px-3 py-2 text-center text-sm text-neutral-600">
              Pembayaran tepat sejumlah{' '}
              <span className="font-mono font-bold">{formatCurrency(cartTotal)}</span>
            </div>
          )}

          {/* Confirm */}
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

// ---------------------------------------------------------------------------
// POSScreen
// ---------------------------------------------------------------------------

export default function POSScreen() {
  const { products, loadProducts } = useProductStore()
  const { createTransaction } = useTransactionStore()

  const [cart, setCart] = useState<CartItem[]>([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item,
        )
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
        },
      ]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, qty: item.qty + delta } : item,
        )
        .filter((item) => item.qty > 0),
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const clearCart = () => setCart([])

  const handleCheckout = async (paymentMethod: PaymentMethod, paidAmount: number) => {
    setIsSaving(true)
    try {
      const cartItems = cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        qty: item.qty,
        price: item.price,
        costPrice: item.costPrice,
      }))

      const txn = await createTransaction(
        cartItems,
        cartTotal,
        cartTotal,
        paidAmount,
        paymentMethod,
      )

      // Refresh product stock in productStore after sale
      void loadProducts()

      const changeAmount = Math.max(0, paidAmount - cartTotal)
      const changeText =
        paymentMethod === 'cash' && changeAmount > 0
          ? ` · Kembalian: ${formatCurrency(changeAmount)}`
          : ''

      setSuccessMessage(`✓ ${txn.invoiceNo} berhasil disimpan!${changeText}`)
      clearCart()
      setIsCheckoutOpen(false)
      setTimeout(() => setSuccessMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-neutral-500">Kasir</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900">Transaksi Baru</h2>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="rounded-md bg-success-50 px-4 py-3 text-sm font-semibold text-success-700">
          {successMessage}
        </div>
      )}

      {/* Search */}
      <ProductSearchBar products={products} onSelect={addToCart} />

      {/* Cart */}
      {cart.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 py-14 text-center">
          <p className="text-sm text-neutral-500">Belum ada produk di keranjang.</p>
          <p className="mt-1 text-xs text-neutral-400">Cari produk di atas untuk mulai transaksi.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900">{item.productName}</p>
                <p className="font-mono text-xs text-neutral-500">{formatCurrency(item.price)}</p>
              </div>

              {/* Qty controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQty(item.productId, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-sm font-bold text-neutral-600 hover:bg-neutral-100"
                >
                  −
                </button>
                <span className="font-mono w-6 text-center text-sm font-bold">{item.qty}</span>
                <button
                  type="button"
                  onClick={() => updateQty(item.productId, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white hover:bg-primary-800"
                >
                  +
                </button>
              </div>

              {/* Subtotal + remove */}
              <div className="min-w-[72px] text-right">
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
          ))}
        </div>
      )}

      {/* Total + Checkout */}
      {cart.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-surface px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500">{cartCount} item · {cart.length} jenis</p>
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
              onClick={() => setIsCheckoutOpen(true)}
              className="flex-1 rounded-md bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-800"
            >
              Proses Pembayaran
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          cartTotal={cartTotal}
          isSaving={isSaving}
          onClose={() => !isSaving && setIsCheckoutOpen(false)}
          onConfirm={handleCheckout}
        />
      )}
    </section>
  )
}
