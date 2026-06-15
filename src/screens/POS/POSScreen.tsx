import { useEffect, useMemo, useRef, useState } from 'react'
import { ReceiptActionSheet } from '@/components/receipt/ReceiptActionSheet'
import type { ReceiptPreviewItem } from '@/components/receipt/ReceiptPreview'
import { printReceipt, type ReceiptSnapshot } from '@/components/receipt/receiptUtils'
import { useProductStore } from '@/store/productStore'
import { useTransactionStore } from '@/store/transactionStore'
import type { PaymentMethod, Product } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { getStoreProfile } from '@/lib/storeProfile'
import { getReceiptSettings } from '@/lib/receiptSettings'
import { isNativeApp } from '@/native/platform'
import { hapticSuccess } from '@/native/haptics'
import BarcodeScannerModal from '@/components/scanner/BarcodeScannerModal'
import { db } from '@/infra/db/dexie'
import type { Customer } from '@/domain'
import { Icon, PageHeader, type IconName } from '@/components/ui'

interface CartItem {
  productId: string
  productName: string
  sku?: string
  price: number
  costPrice: number
  qty: number
  qtyInput: string
  stock: number   // stok tersedia saat ditambahkan — untuk validasi batas qty
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: IconName }[] = [
  { value: 'cash',     label: 'Tunai',    icon: 'cash' },
  { value: 'qris',     label: 'QRIS',     icon: 'qr' },
  { value: 'transfer', label: 'Transfer', icon: 'bank' },
  { value: 'piutang',  label: 'Piutang',  icon: 'credit-card' },
]

function normalizeQtyInput(value: string, fallback = 1): number {
  const parsed = Math.floor(Number(value))
  if (Number.isFinite(parsed) && parsed >= 1) return parsed
  return Math.max(1, fallback)
}

function normalizeCartItem(item: CartItem): CartItem {
  const raw = normalizeQtyInput(item.qtyInput, item.qty)
  const qty = item.stock > 0 ? Math.min(raw, item.stock) : raw
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
  const [showCameraScanner, setShowCameraScanner] = useState(false)

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
    setScanMessage(`${product.name} ditambahkan ke keranjang.`)
  }

  const handleBarcodeSubmit = (overrideValue?: string) => {
    const value = (overrideValue ?? query).trim()
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

    setScanMessage(`Barcode "${value}" tidak ditemukan.`)
  }

  const handleScanButtonPress = () => {
    if (isNativeApp()) {
      // Android/iOS: buka kamera scanner
      setShowCameraScanner(true)
      setScanMessage(null)
    } else {
      // Web: fokus input untuk scanner USB/Bluetooth
      inputRef.current?.focus()
      setScanMessage('Scanner USB/Bluetooth siap. Scan barcode ke kolom ini.')
    }
  }

  const handleCameraScan = (value: string) => {
    setShowCameraScanner(false)
    // Cari produk langsung dari hasil scan kamera
    const product = products.find((p) => p.barcode?.trim() === value)
    if (product) {
      handleSelect(product)
    } else {
      setQuery(value)
      setScanMessage(`Barcode "${value}" tidak ditemukan di daftar produk.`)
    }
  }

  return (
    <>
      {/* Modal kamera barcode — hanya muncul saat showCameraScanner = true */}
      {showCameraScanner && (
        <BarcodeScannerModal
          onScan={handleCameraScan}
          onClose={() => setShowCameraScanner(false)}
        />
      )}

      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Icon
              name="search"
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-dark-muted"
            />
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
              className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-white dark:placeholder-dark-muted dark:focus:border-primary-400"
            />
          </div>
          <button
            type="button"
            onClick={handleScanButtonPress}
            aria-label="Scan barcode"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-dark-border dark:bg-dark-elevated dark:text-dark-muted dark:hover:bg-dark-border"
          >
            <Icon name={isNativeApp() ? 'camera' : 'scan'} size={18} />
            Scan
          </button>
        </div>

        {scanMessage && <p className="text-xs font-semibold text-neutral-500 dark:text-dark-muted">{scanMessage}</p>}

        {showDropdown && (
          <div className="relative">
            <div className="absolute left-0 right-0 z-30 overflow-hidden rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => handleSelect(p)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-dark-elevated"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-dark-muted">
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
    </>
  )
}

function quickCashPresets(total: number): number[] {
  const round = (n: number, to: number) => Math.ceil(n / to) * to
  const candidates = [
    total,
    round(total, 5_000),
    round(total, 10_000),
    round(total, 50_000),
    round(total, 100_000),
  ]
  return [...new Set(candidates)].filter((v) => v >= total).slice(0, 5)
}

interface CheckoutModalProps {
  cartTotal: number
  isSaving: boolean
  onClose: () => void
  onConfirm: (
    paymentMethod: PaymentMethod,
    paidAmount: number,
    transactionDate: string,
    discount: number,
    notes?: string,
    customerId?: string,
    customerName?: string,
  ) => Promise<void>
}

function CheckoutModal({ cartTotal, isSaving, onClose, onConfirm }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paidAmountStr, setPaidAmountStr] = useState('')
  const [discountStr, setDiscountStr] = useState('')
  const [transactionDateLocal, setTransactionDateLocal] = useState(() => toDateTimeLocalValue())
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])

  const discount = Math.max(0, Math.min(Number(discountStr) || 0, cartTotal))
  const effectiveTotal = cartTotal - discount
  const paidAmount = Number(paidAmountStr) || 0
  const change = paidAmount - effectiveTotal
  const isCash = paymentMethod === 'cash'
  const isPiutang = paymentMethod === 'piutang'
  const canConfirm = !isSaving && (!isCash || paidAmount >= effectiveTotal)

  // Muat daftar pelanggan sekali saat modal dibuka
  useEffect(() => {
    db.customers.toArray().then(setCustomers).catch(() => setCustomers([]))
  }, [])

  const handleConfirm = async () => {
    setCheckoutError(null)
    try {
      const finalPaid = isCash ? paidAmount : isPiutang ? 0 : effectiveTotal
      const pickedCustomer = selectedCustomerId
        ? customers.find((c) => c.id === selectedCustomerId)
        : undefined
      await onConfirm(
        paymentMethod,
        finalPaid,
        dateTimeLocalToIso(transactionDateLocal),
        discount,
        notes.trim() || undefined,
        pickedCustomer?.id,
        pickedCustomer?.nama,
      )
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={isSaving ? undefined : onClose} />
      <div
        data-bottom-sheet="true"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white dark:bg-dark-elevated sm:max-h-[85vh] sm:rounded-2xl"
      >
        {/* Header — fixed */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 dark:border-dark-border px-5 py-4">
          <h3 className="font-bold text-neutral-900 dark:text-white">Pembayaran</h3>
          {!isSaving && (
            <button
              type="button"
              onClick={onClose}
              data-android-back-close="true"
              className="text-sm font-medium text-neutral-500 dark:text-dark-muted hover:text-neutral-800"
            >
              Batal
            </button>
          )}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          {checkoutError && (
            <div className="rounded-md bg-danger-50 dark:bg-danger-700/20 px-3 py-2 text-sm text-danger-700 dark:text-danger-500">
              {checkoutError}
            </div>
          )}

          <div className="rounded-2xl bg-primary-50 px-4 py-4 text-center dark:bg-primary-900/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-dark-muted">Total Tagihan</p>
            <p className="mt-1 font-mono text-3xl font-bold text-primary-700 dark:text-primary-300">
              {formatCurrency(effectiveTotal)}
            </p>
            {discount > 0 && (
              <p className="mt-0.5 text-xs text-success-700 dark:text-success-400 font-semibold">
                Diskon {formatCurrency(discount)} dari {formatCurrency(cartTotal)}
              </p>
            )}
          </div>

          {/* Diskon per transaksi */}
          <div>
            <p className="mb-1 text-xs font-semibold text-neutral-600 dark:text-dark-muted">Diskon (opsional)</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={discountStr}
              onChange={(e) => {
                setDiscountStr(e.target.value)
                setPaidAmountStr('') // reset uang diterima saat diskon berubah
              }}
              placeholder="0"
              className="w-full rounded-md border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-900 dark:text-white px-3 py-2.5 font-mono text-sm focus:border-primary dark:focus:border-primary-400 focus:outline-none"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-neutral-600 dark:text-dark-muted">Tanggal Transaksi</p>
            <input
              type="datetime-local"
              value={transactionDateLocal}
              onChange={(e) => setTransactionDateLocal(e.target.value)}
              className="w-full rounded-md border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-900 dark:text-white px-3 py-3 text-sm font-semibold focus:border-primary dark:focus:border-primary-400 focus:outline-none"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-neutral-600 dark:text-dark-muted">Metode Pembayaran</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m.value)
                    setPaidAmountStr('')
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
                    paymentMethod === m.value
                      ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                      : m.value === 'piutang'
                        ? 'border-warning-300 dark:border-warning-700/50 text-warning-700 dark:text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-700/10'
                        : 'border-neutral-300 dark:border-dark-border text-neutral-700 dark:text-white hover:border-primary/50'
                  }`}
                >
                  <Icon name={m.icon} size={18} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {isCash && (
            <div>
              <p className="mb-1 text-xs font-semibold text-neutral-600 dark:text-dark-muted">Uang Diterima</p>
              <input
                type="number"
                inputMode="numeric"
                value={paidAmountStr}
                onChange={(e) => setPaidAmountStr(e.target.value)}
                placeholder="Masukkan nominal..."
                min={effectiveTotal}
                autoFocus
                className="w-full rounded-md border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-900 dark:text-white px-3 py-3 font-mono text-lg font-bold focus:border-primary dark:focus:border-primary-400 focus:outline-none"
              />
              {/* Quick cash chips */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickCashPresets(effectiveTotal).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPaidAmountStr(String(preset))}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      Number(paidAmountStr) === preset
                        ? 'border-primary bg-primary text-white'
                        : 'border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-elevated text-neutral-700 dark:text-dark-muted hover:border-primary/60'
                    }`}
                  >
                    {preset === effectiveTotal ? 'Pas' : formatCurrency(preset)}
                  </button>
                ))}
              </div>
              {paidAmount > 0 && (
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-dark-muted">Kembalian</span>
                  <span
                    className={`font-mono font-bold ${
                      change >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-700 dark:text-danger-500'
                    }`}
                  >
                    {change >= 0 ? formatCurrency(change) : '-'}
                  </span>
                </div>
              )}
            </div>
          )}

          {!isCash && !isPiutang && (
            <div className="rounded-md bg-neutral-100 dark:bg-dark-elevated px-3 py-2 text-center text-sm text-neutral-600 dark:text-dark-muted">
              Pembayaran tepat sejumlah{' '}
              <span className="font-mono font-bold">{formatCurrency(effectiveTotal)}</span>
            </div>
          )}

          {isPiutang && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2 rounded-xl bg-warning-50 px-3 py-2.5 text-sm text-warning-700 dark:bg-warning-700/15 dark:text-warning-500">
                <Icon name="credit-card" size={16} className="shrink-0" />
                Piutang — pembayaran dicatat sebagai hutang
              </div>
              {!selectedCustomerId && (
                <div className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:border-dark-border dark:bg-dark-elevated dark:text-dark-muted">
                  <Icon name="info" size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Sebaiknya pilih <strong>pelanggan</strong> agar piutang mudah dilacak di tab Piutang.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Pelanggan — tampil untuk semua metode jika ada data pelanggan */}
          {customers.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-neutral-600 dark:text-dark-muted">
                Pelanggan (opsional)
              </p>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-md border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary dark:focus:border-primary-400 focus:outline-none"
              >
                <option value="">— Pilih pelanggan (opsional) —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama}{c.telepon ? ` · ${c.telepon}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Catatan — tampil untuk semua metode */}
          <div>
            <p className="mb-1 text-xs font-semibold text-neutral-600 dark:text-dark-muted">
              Catatan (opsional)
            </p>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: ambil nanti sore"
              className="w-full rounded-md border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-900 dark:text-white px-3 py-2.5 text-sm focus:border-primary dark:focus:border-primary-400 focus:outline-none"
            />
          </div>

        </div>
        </div>

        {/* Footer — sticky confirm button */}
        <div className="shrink-0 border-t border-neutral-200 dark:border-dark-border px-5 py-4">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-sm font-bold text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              'Menyimpan...'
            ) : (
              <>
                <Icon name="check-circle" size={18} />
                Konfirmasi Pembayaran
              </>
            )}
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
  const [stockAlert, setStockAlert] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  const showStockAlert = (msg: string) => {
    setStockAlert(msg)
    setTimeout(() => setStockAlert(null), 2500)
  }

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showStockAlert(`Stok ${product.name} habis`)
      return
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        if (existing.qty >= product.stock) {
          showStockAlert(`Stok ${product.name} hanya ${product.stock} ${product.unit || 'pcs'}`)
          return prev
        }
        return prev.map((item) => {
          if (item.productId !== product.id) return item
          const qty = Math.min(item.qty + 1, product.stock)
          return { ...item, qty, qtyInput: String(qty), stock: product.stock }
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
          stock: product.stock,
        },
      ]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item
        const qty = Math.max(1, Math.min(item.qty + delta, item.stock))
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
          const qty = item.stock > 0 ? Math.min(parsed, item.stock) : parsed
          return { ...item, qty, qtyInput: value }
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
    setShowClearConfirm(true)
  }

  const openCheckout = () => {
    commitAllQtyInputs()
    setIsCheckoutOpen(true)
  }

  const handleCheckout = async (
    paymentMethod: PaymentMethod,
    paidAmount: number,
    transactionDate: string,
    discount: number,
    notes?: string,
    customerId?: string,
    customerName?: string,
  ) => {
    setIsSaving(true)
    try {
      const normalizedCart = cart.map(normalizeCartItem)
      const itemsTotal = normalizedCart.reduce((sum, item) => sum + item.price * item.qty, 0)
      const finalDiscount = Math.max(0, Math.min(discount, itemsTotal))
      const finalTotal = itemsTotal - finalDiscount
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
        itemsTotal,
        finalDiscount,
        finalTotal,
        paidAmount,
        paymentMethod,
        notes,
        transactionDate,
        customerId,
      )

      const receiptItems: ReceiptPreviewItem[] = normalizedCart.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        qty: item.qty,
        price: item.price,
        discount: 0,
        subtotal: item.price * item.qty,
      }))

      const snapshot: ReceiptSnapshot = {
        transaction: txn,
        items: receiptItems,
        storeProfile: getStoreProfile(),
        cashierName: 'Kasir',
        customerName,
      }
      setReceiptSnapshot(snapshot)

      // Haptic feedback — getaran sukses di Android
      void hapticSuccess()

      // Auto print jika setting aktif
      const receiptCfg = getReceiptSettings()
      if (receiptCfg.autoPrint) {
        // Beri sedikit jeda agar ActionSheet sempat render dulu
        setTimeout(() => printReceipt(snapshot), 300)
      }

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
      <PageHeader eyebrow="Kasir" title="Transaksi Baru" icon="cart" />

      {successMessage && (
        <div className="flex animate-fade-in items-center gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm font-semibold text-success-700 dark:bg-success-700/20 dark:text-success-400">
          <Icon name="check-circle" size={18} className="shrink-0" />
          {successMessage}
        </div>
      )}

      {stockAlert && (
        <div className="flex animate-fade-in items-center gap-2 rounded-xl bg-warning-50 px-4 py-3 text-sm font-semibold text-warning-700 dark:bg-warning-700/20 dark:text-warning-500">
          <Icon name="alert-triangle" size={18} className="shrink-0" />
          {stockAlert}
        </div>
      )}

      <ProductSearchBar products={products} onSelect={addToCart} />

      {cart.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-neutral-300 py-14 text-center dark:border-dark-border">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-400 dark:bg-primary-900/30 dark:text-primary-300">
            <Icon name="cart" size={26} />
          </span>
          <p className="text-sm font-semibold text-neutral-600 dark:text-dark-muted">Belum ada produk di keranjang.</p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-dark-muted">
            Cari produk di atas untuk mulai transaksi.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="animate-fade-in rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 shadow-soft dark:border-dark-border dark:bg-dark-card"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                    {item.productName}
                  </p>
                  <p className="font-mono text-xs text-neutral-500 dark:text-dark-muted">
                    {formatCurrency(item.price)}
                    {item.stock > 0 && (
                      <span className={`ml-2 ${item.qty >= item.stock ? 'text-warning-600 dark:text-warning-500 font-semibold' : 'text-neutral-400 dark:text-dark-muted'}`}>
                        · Stok: {item.stock}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex min-w-[86px] flex-col items-end">
                  <p className="font-mono text-sm font-bold text-primary">
                    {formatCurrency(item.price * item.qty)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId)}
                    className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-danger-600 hover:text-danger-700 dark:text-danger-500"
                  >
                    <Icon name="trash" size={13} />
                    Hapus
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-neutral-500 dark:text-dark-muted">Qty</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, -1)}
                    disabled={item.qty <= 1}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-40 dark:border-dark-border dark:text-dark-muted dark:hover:bg-dark-elevated"
                    aria-label={`Kurangi qty ${item.productName}`}
                  >
                    <Icon name="minus" size={18} strokeWidth={2.5} />
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
                    className="h-10 w-20 rounded-md border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-elevated text-neutral-900 dark:text-white px-2 text-center font-mono text-base font-bold focus:border-primary dark:focus:border-primary-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, 1)}
                    disabled={item.qty >= item.stock}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Tambah qty ${item.productName}`}
                  >
                    <Icon name="plus" size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <div className="rounded-2xl border border-neutral-200/80 bg-white px-4 py-4 shadow-card dark:border-dark-border dark:bg-dark-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 dark:text-dark-muted">
                {cartCount} item · {cart.length} jenis
              </p>
              <p className="text-sm font-semibold text-neutral-700 dark:text-white">Total</p>
            </div>
            <p className="font-mono text-2xl font-bold text-primary-700 dark:text-primary-300">{formatCurrency(cartTotal)}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={clearCart}
              aria-label="Kosongkan keranjang"
              className="flex items-center gap-1.5 rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-dark-border dark:text-dark-muted dark:hover:bg-dark-elevated"
            >
              <Icon name="trash" size={16} />
              Kosongkan
            </button>
            <button
              type="button"
              onClick={openCheckout}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Icon name="wallet" size={18} />
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

      {/* Konfirmasi kosongkan keranjang */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowClearConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-t-2xl bg-white dark:bg-dark-elevated p-5 sm:rounded-2xl">
            <h3 className="font-bold text-neutral-900 dark:text-white">Kosongkan Keranjang?</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-dark-muted">
              Semua {cart.length} produk di keranjang akan dihapus.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => { clearCartSilently(); setShowClearConfirm(false) }}
                className="w-full rounded-xl bg-danger-600 py-3 text-sm font-bold text-white hover:bg-danger-700"
              >
                Ya, Kosongkan
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="w-full rounded-xl border border-neutral-200 dark:border-dark-border py-3 text-sm font-semibold text-neutral-700 dark:text-white"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
