import { useEffect, useMemo, useRef, useState } from 'react'
import { ReceiptActionSheet } from '@/components/receipt/ReceiptActionSheet'
import type { ReceiptPreviewItem } from '@/components/receipt/ReceiptPreview'
import { printReceipt, type ReceiptSnapshot } from '@/components/receipt/receiptUtils'
import { useProductStore } from '@/store/productStore'
import { useTransactionStore } from '@/store/transactionStore'
import { useCartStore, normalizeCartItem, type Cart } from '@/store/cartStore'
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

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: IconName }[] = [
  { value: 'cash',     label: 'Tunai',    icon: 'cash' },
  { value: 'qris',     label: 'QRIS',     icon: 'qr' },
  { value: 'transfer', label: 'Transfer', icon: 'bank' },
  { value: 'piutang',  label: 'Piutang',  icon: 'credit-card' },
]

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

// ── Daftar produk + pencarian + scan barcode ────────────────────────────────

interface ProductPickerProps {
  products: Product[]
  /** Qty per produk di keranjang aktif — untuk badge di tombol tambah. */
  cartQty: Record<string, number>
  onAdd: (product: Product) => void
  /** Pesan singkat dari hasil scan / penambahan (mis. produk habis). */
  onScanMessage: (msg: string | null) => void
}

function ProductPicker({ products, cartQty, onAdd, onScanMessage }: ProductPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [showCameraScanner, setShowCameraScanner] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)),
    )
  }, [products, query])

  const handleAdd = (product: Product) => {
    onAdd(product)
  }

  const handleBarcodeSubmit = () => {
    const value = query.trim()
    if (!value) {
      inputRef.current?.focus()
      onScanMessage('Scan atau ketik barcode lalu tekan Enter.')
      return
    }
    const exact = products.find((p) => p.barcode?.trim() === value)
    if (exact) {
      handleAdd(exact)
      setQuery('')
      return
    }
    // Jika hanya satu hasil pencarian, tambahkan langsung saat Enter.
    if (results.length === 1) {
      handleAdd(results[0])
      setQuery('')
      return
    }
    onScanMessage(`Barcode "${value}" tidak ditemukan.`)
  }

  const handleScanButtonPress = () => {
    if (isNativeApp()) {
      setShowCameraScanner(true)
      onScanMessage(null)
    } else {
      inputRef.current?.focus()
      onScanMessage('Scanner USB/Bluetooth siap. Scan barcode ke kolom ini.')
    }
  }

  const handleCameraScan = (value: string) => {
    setShowCameraScanner(false)
    const product = products.find((p) => p.barcode?.trim() === value)
    if (product) {
      handleAdd(product)
    } else {
      setQuery(value)
      onScanMessage(`Barcode "${value}" tidak ditemukan di daftar produk.`)
    }
  }

  return (
    <>
      {showCameraScanner && (
        <BarcodeScannerModal onScan={handleCameraScan} onClose={() => setShowCameraScanner(false)} />
      )}

      <div className="space-y-3">
        {/* Search + scan */}
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
                onScanMessage(null)
              }}
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

        {/* Daftar produk — tap untuk menambah ke keranjang */}
        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 py-12 text-center dark:border-dark-border">
            <p className="text-sm font-semibold text-neutral-600 dark:text-dark-muted">
              {products.length === 0 ? 'Belum ada produk.' : 'Produk tidak ditemukan.'}
            </p>
            <p className="mt-1 text-xs text-neutral-400 dark:text-dark-muted">
              {products.length === 0
                ? 'Tambah produk dulu di menu Produk.'
                : 'Coba kata kunci lain.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {results.map((p) => {
              const inCart = cartQty[p.id] ?? 0
              const isHabis = p.stock <= 0
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(p)}
                    disabled={isHabis}
                    className={`flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left shadow-soft transition-colors dark:bg-dark-card ${
                      isHabis
                        ? 'cursor-not-allowed border-neutral-200/80 opacity-60 dark:border-dark-border'
                        : 'border-neutral-200/80 hover:border-primary/40 active:bg-neutral-50 dark:border-dark-border dark:active:bg-dark-elevated'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                        {p.name}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-dark-muted">
                        {p.sku}
                        {isHabis ? (
                          <span className="ml-1 font-semibold text-danger-600 dark:text-danger-500">
                            · Habis
                          </span>
                        ) : p.stock <= p.minStock && p.minStock > 0 ? (
                          <span className="ml-1 font-semibold text-warning-600 dark:text-warning-500">
                            · Stok menipis ({p.stock} {p.unit})
                          </span>
                        ) : (
                          <span className="ml-1">· Stok: {p.stock} {p.unit}</span>
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-sm font-bold text-primary">
                      {formatCurrency(p.sellPrice)}
                    </p>
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isHabis
                          ? 'bg-neutral-100 text-neutral-300 dark:bg-dark-elevated'
                          : inCart > 0
                            ? 'bg-primary text-white'
                            : 'bg-primary-50 text-primary dark:bg-primary-900/30 dark:text-primary-300'
                      }`}
                    >
                      {inCart > 0 ? (
                        <span className="font-mono text-sm font-bold">{inCart}</span>
                      ) : (
                        <Icon name="plus" size={18} strokeWidth={2.5} />
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

// ── Tab pemilih keranjang (multi-keranjang) ─────────────────────────────────

interface CartTabsProps {
  carts: Cart[]
  activeCartId: string
  onSelect: (id: string) => void
  onAdd: () => void
}

function CartTabs({ carts, activeCartId, onSelect, onAdd }: CartTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {carts.map((c) => {
        const count = c.items.reduce((s, i) => s + i.qty, 0)
        const active = c.id === activeCartId
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary/40 dark:border-dark-border dark:bg-dark-card dark:text-dark-muted'
            }`}
          >
            <Icon name="cart" size={13} />
            {c.label}
            {count > 0 && (
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold ${
                  active ? 'bg-white/25 text-white' : 'bg-primary-50 text-primary dark:bg-primary-900/40 dark:text-primary-300'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Keranjang baru"
        className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-primary/50 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/20"
      >
        <Icon name="plus" size={14} strokeWidth={2.5} />
        Keranjang
      </button>
    </div>
  )
}

// ── Panel keranjang (bottom sheet terpisah) ─────────────────────────────────

interface CartDrawerProps {
  cart: Cart
  total: number
  count: number
  hasMultiple: boolean
  onClose: () => void
  onUpdateQty: (productId: string, delta: number) => void
  onSetQtyInput: (productId: string, value: string) => void
  onCommitQtyInput: (productId: string) => void
  onRemoveItem: (productId: string) => void
  onClear: () => void
  onCheckout: () => void
  onRename: (label: string) => void
  onRemoveCart: () => void
}

function CartDrawer({
  cart,
  total,
  count,
  hasMultiple,
  onClose,
  onUpdateQty,
  onSetQtyInput,
  onCommitQtyInput,
  onRemoveItem,
  onClear,
  onCheckout,
  onRename,
  onRemoveCart,
}: CartDrawerProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [labelDraft, setLabelDraft] = useState(cart.label)

  const submitRename = () => {
    onRename(labelDraft)
    setIsRenaming(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        data-bottom-sheet="true"
        className="relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl bg-white dark:bg-dark-elevated sm:max-h-[85vh] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-5 py-4 dark:border-dark-border">
          {isRenaming ? (
            <input
              autoFocus
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename()
                if (e.key === 'Escape') setIsRenaming(false)
              }}
              className="min-w-0 flex-1 rounded-lg border border-primary bg-white px-2 py-1 text-base font-bold text-neutral-900 focus:outline-none dark:border-primary-400 dark:bg-dark-card dark:text-white"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setLabelDraft(cart.label)
                setIsRenaming(true)
              }}
              className="flex min-w-0 items-center gap-1.5 text-left"
            >
              <h3 className="truncate font-bold text-neutral-900 dark:text-white">{cart.label}</h3>
              <Icon name="edit" size={14} className="shrink-0 text-neutral-400 dark:text-dark-muted" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            data-android-back-close="true"
            className="shrink-0 text-sm font-medium text-neutral-500 hover:text-neutral-800 dark:text-dark-muted"
          >
            Tutup
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-400 dark:bg-primary-900/30 dark:text-primary-300">
                <Icon name="cart" size={26} />
              </span>
              <p className="text-sm font-semibold text-neutral-600 dark:text-dark-muted">
                Keranjang ini masih kosong.
              </p>
              <p className="mt-1 text-xs text-neutral-400 dark:text-dark-muted">
                Tutup panel ini lalu pilih produk untuk menambah.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.items.map((item) => (
                <div
                  key={item.productId}
                  className="rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 shadow-soft dark:border-dark-border dark:bg-dark-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                        {item.productName}
                      </p>
                      <p className="font-mono text-xs text-neutral-500 dark:text-dark-muted">
                        {formatCurrency(item.price)}
                        {item.stock > 0 && (
                          <span
                            className={`ml-2 ${
                              item.qty >= item.stock
                                ? 'font-semibold text-warning-600 dark:text-warning-500'
                                : 'text-neutral-400 dark:text-dark-muted'
                            }`}
                          >
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
                        onClick={() => onRemoveItem(item.productId)}
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
                        onClick={() => onUpdateQty(item.productId, -1)}
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
                        onChange={(e) => onSetQtyInput(item.productId, e.target.value)}
                        onBlur={() => onCommitQtyInput(item.productId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                        aria-label={`Qty ${item.productName}`}
                        className="h-10 w-20 rounded-md border border-neutral-300 bg-white px-2 text-center font-mono text-base font-bold text-neutral-900 focus:border-primary focus:outline-none dark:border-dark-border dark:bg-dark-elevated dark:text-white dark:focus:border-primary-400"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.productId, 1)}
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

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClear}
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-danger-600 dark:text-dark-muted"
                >
                  <Icon name="trash" size={14} />
                  Kosongkan keranjang
                </button>
                {hasMultiple && (
                  <button
                    type="button"
                    onClick={onRemoveCart}
                    className="flex items-center gap-1.5 text-xs font-semibold text-danger-600 hover:text-danger-700 dark:text-danger-500"
                  >
                    <Icon name="x" size={14} />
                    Hapus keranjang ini
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-neutral-200 px-5 py-4 dark:border-dark-border">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-neutral-500 dark:text-dark-muted">{count} item</p>
            <p className="font-mono text-2xl font-bold text-primary-700 dark:text-primary-300">
              {formatCurrency(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCheckout}
            disabled={cart.items.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-sm font-bold text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="wallet" size={18} />
            Proses Pembayaran
          </button>
        </div>
      </div>
    </div>
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
  const {
    carts,
    activeCartId,
    setActiveCart,
    addCart,
    removeCart,
    renameCart,
    addItem,
    updateQty,
    setQtyInput,
    commitQtyInput,
    commitAllQtyInputs,
    removeItem,
    clearActiveCart,
    completeActiveCart,
  } = useCartStore()

  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [receiptSnapshot, setReceiptSnapshot] = useState<ReceiptSnapshot | null>(null)
  const [stockAlert, setStockAlert] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const activeCart = carts.find((c) => c.id === activeCartId) ?? carts[0]
  const cart = useMemo(() => activeCart?.items ?? [], [activeCart])

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  const cartQty = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of cart) map[item.productId] = item.qty
    return map
  }, [cart])

  const showStockAlert = (msg: string) => {
    setStockAlert(msg)
    setTimeout(() => setStockAlert(null), 2500)
  }

  const handleAddProduct = (product: Product) => {
    const result = addItem(product)
    if (!result.ok && result.message) {
      showStockAlert(result.message)
    }
  }

  const handleClear = () => {
    if (cart.length === 0) return
    setShowClearConfirm(true)
  }

  const openCheckout = () => {
    commitAllQtyInputs()
    setIsCartOpen(false)
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
      const currentItems = useCartStore.getState().carts.find((c) => c.id === activeCartId)?.items ?? []
      const normalizedCart = currentItems.map(normalizeCartItem)
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
        setTimeout(() => printReceipt(snapshot), 300)
      }

      void loadProducts()

      const changeText =
        paymentMethod === 'cash' && txn.changeAmount > 0
          ? ` - Kembalian: ${formatCurrency(txn.changeAmount)}`
          : ''

      setSuccessMessage(`${txn.invoiceNo} berhasil disimpan!${changeText}`)
      completeActiveCart()
      setIsCheckoutOpen(false)
      setTimeout(() => setSuccessMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-4 pb-28">
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

      {/* Pemilih keranjang (bisa lebih dari satu untuk pelanggan berbeda) */}
      <CartTabs
        carts={carts}
        activeCartId={activeCartId}
        onSelect={setActiveCart}
        onAdd={addCart}
      />

      <ProductPicker
        products={products}
        cartQty={cartQty}
        onAdd={handleAddProduct}
        onScanMessage={(msg) => msg && showStockAlert(msg)}
      />

      {/* Tombol mengambang menuju keranjang */}
      <div className="fixed inset-x-0 bottom-24 z-30 px-4" data-floating-action="true">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-brand-gradient px-5 py-3.5 text-white shadow-lifted transition-all hover:brightness-110 active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5">
              <span className="relative">
                <Icon name="cart" size={22} />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-primary-700">
                    {cartCount}
                  </span>
                )}
              </span>
              <span className="text-sm font-bold">
                {cartCount > 0 ? 'Lihat Keranjang' : 'Keranjang kosong'}
              </span>
            </span>
            <span className="font-mono text-base font-bold">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      </div>

      {isCartOpen && activeCart && (
        <CartDrawer
          cart={activeCart}
          total={cartTotal}
          count={cartCount}
          hasMultiple={carts.length > 1}
          onClose={() => setIsCartOpen(false)}
          onUpdateQty={updateQty}
          onSetQtyInput={setQtyInput}
          onCommitQtyInput={commitQtyInput}
          onRemoveItem={removeItem}
          onClear={handleClear}
          onCheckout={openCheckout}
          onRename={(label) => renameCart(activeCartId, label)}
          onRemoveCart={() => {
            removeCart(activeCartId)
            setIsCartOpen(false)
          }}
        />
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
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowClearConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-t-2xl bg-white dark:bg-dark-elevated p-5 sm:rounded-2xl">
            <h3 className="font-bold text-neutral-900 dark:text-white">Kosongkan Keranjang?</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-dark-muted">
              Semua {cart.length} produk di keranjang akan dihapus.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  clearActiveCart()
                  setShowClearConfirm(false)
                }}
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
