import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useProductStore } from '@/store/productStore'
import { DexieProductRepository } from '@/repositories/implementations/DexieProductRepository'
import { DexieCategoryRepository } from '@/repositories/implementations/DexieCategoryRepository'
import { DeleteProductUseCase } from '@/usecases/product/DeleteProductUseCase'
import type { Product } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { csvEscape, parseCsv } from '@/lib/csv'
import { downloadBlob } from '@/services/export/download'
import { db } from '@/infra/db/dexie'
import { generateId } from '@/lib/id-generator'
import type { CreateProductInput } from '@/usecases/product/CreateProductUseCase'
import type { UpdateProductInput } from '@/usecases/product/UpdateProductUseCase'
import { Icon, PageHeader } from '@/components/ui'

const deleteUseCase = new DeleteProductUseCase(new DexieProductRepository())
const categoryRepo = new DexieCategoryRepository()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductFormValues {
  name: string
  sku: string
  barcode: string
  categoryId: string
  sellPrice: string
  costPrice: string
  stock: string
  minStock: string
  unit: string
}

const DEFAULT_FORM_VALUES: ProductFormValues = {
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  sellPrice: '',
  costPrice: '0',
  stock: '0',
  minStock: '0',
  unit: 'pcs',
}

const PRODUCT_CSV_HEADERS = [
  'name',
  'sku',
  'barcode',
  'category',
  'costPrice',
  'sellPrice',
  'stock',
  'minStock',
  'unit',
  'isActive',
] as const

interface ImportSummary {
  success: number
  failed: number
  duplicate: number
}

function parseNumber(value: string | undefined, fallback = 0): number {
  const parsed = Number(value ?? '')
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function parseBoolean(value: string | undefined, fallback = true): boolean {
  const normalized = (value ?? '').trim().toLowerCase()
  if (!normalized) return fallback
  return ['true', '1', 'yes', 'ya', 'aktif'].includes(normalized)
}

function generateInternalBarcode(existingBarcodes: Set<string>): string {
  for (let i = 0; i < 20; i += 1) {
    const random = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0')
    const suffix = Date.now().toString().slice(-7)
    const barcode = `290${suffix}${random}`.slice(0, 13)
    if (!existingBarcodes.has(barcode)) return barcode
  }

  return `290${Math.floor(Math.random() * 10_000_000_000).toString().padStart(10, '0')}`
}

function downloadProductCsvTemplate(): void {
  const rows = [
    PRODUCT_CSV_HEADERS.join(','),
    [
      'Mouse Wireless',
      'MS-001',
      '899000000001',
      'Aksesoris',
      45000,
      75000,
      20,
      3,
      'pcs',
      true,
    ]
      .map(csvEscape)
      .join(','),
    ['Pulpen Biru', 'ATK-001', '899000000002', 'ATK', 2000, 3500, 100, 10, 'pcs', true]
      .map(csvEscape)
      .join(','),
  ]
  downloadBlob(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' }), 'template-produk-aman-kasir.csv')
}

function productToFormValues(p: Product): ProductFormValues {
  return {
    name: p.name,
    sku: p.sku,
    barcode: p.barcode ?? '',
    categoryId: p.categoryId ?? '',
    sellPrice: String(p.sellPrice),
    costPrice: String(p.costPrice),
    stock: String(p.stock),
    minStock: String(p.minStock),
    unit: p.unit,
  }
}

// ---------------------------------------------------------------------------
// StockBadge
// ---------------------------------------------------------------------------

function fmtStock(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 10_000)    return `${Math.round(n / 1_000)}rb`
  return String(n)
}

function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  const isZero = stock === 0
  const isLow = !isZero && minStock > 0 && stock <= minStock

  const colorClass = isZero
    ? 'bg-danger-50 dark:bg-danger-700/20 text-danger-700 dark:text-danger-500'
    : isLow
      ? 'bg-warning-50 dark:bg-warning-700/20 text-warning-700 dark:text-warning-500'
      : 'bg-success-50 dark:bg-success-700/20 text-success-700 dark:text-success-400'

  const label = isZero ? 'Habis' : fmtStock(stock)

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colorClass}`}
      title={isZero ? 'Habis' : String(stock)}
    >
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// ProductFormModal
// ---------------------------------------------------------------------------

type DeleteStep = 'idle' | 'checking' | 'confirm-safe' | 'confirm-warned' | 'deleting'

interface ProductFormModalProps {
  isOpen: boolean
  initialValues: ProductFormValues
  editingId: string | null
  categories: { id: string; name: string }[]
  products: Product[]
  onClose: () => void
  onSubmit: (values: ProductFormValues) => Promise<void>
  onDeactivate?: () => Promise<void>
  onHardDelete?: () => Promise<void>
  onCheckHistory?: () => Promise<boolean>
  onAddCategory?: (name: string) => Promise<string>
}

function ProductFormModal({
  isOpen,
  initialValues,
  editingId,
  categories,
  products,
  onClose,
  onSubmit,
  onDeactivate,
  onHardDelete,
  onCheckHistory,
  onAddCategory,
}: ProductFormModalProps) {
  const [values, setValues] = useState<ProductFormValues>(initialValues)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle')
  const [barcodeHint, setBarcodeHint] = useState<string | null>(null)
  const barcodeInputRef = useRef<HTMLInputElement | null>(null)
  const errorRef = useRef<HTMLDivElement | null>(null)

  // ── Inline tambah kategori ──────────────────────────────────────
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [addCatError, setAddCatError] = useState<string | null>(null)

  const handleAddCatInline = async () => {
    const name = newCatName.trim()
    if (!name || !onAddCategory) return
    setAddingCat(true)
    setAddCatError(null)
    try {
      const newId = await onAddCategory(name)
      setValues((prev) => ({ ...prev, categoryId: newId }))
      setShowAddCat(false)
      setNewCatName('')
    } catch (err) {
      setAddCatError(err instanceof Error ? err.message : 'Gagal menambah kategori.')
    } finally {
      setAddingCat(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues)
      setError(null)
      setBarcodeHint(null)
      setDeleteStep('idle')
    }
  }, [isOpen, initialValues])

  // Scroll ke pesan error supaya user selalu melihatnya
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [error])

  if (!isOpen) return null

  const handleChange =
    (field: keyof ProductFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }))
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.name.trim()) {
      setError('Nama produk tidak boleh kosong.')
      return
    }
    // Harga jual — harus angka valid dan tidak negatif
    const sellPriceNum = Number(values.sellPrice.replace(/[^0-9]/g, '')) || 0
    if (sellPriceNum <= 0 && !values.sellPrice.trim()) {
      setError('Harga jual harus diisi.')
      return
    }
    const barcode = values.barcode.trim()
    if (
      barcode &&
      products.some((product) => product.id !== editingId && product.barcode?.trim() === barcode)
    ) {
      setError('Barcode sudah dipakai produk lain.')
      return
    }
    const sku = values.sku.trim()
    if (sku && products.some((product) => product.id !== editingId && product.sku.trim() === sku)) {
      setError('SKU sudah dipakai produk lain.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onSubmit(values)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan produk.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!onDeactivate) return
    const confirmed = window.confirm('Nonaktifkan produk ini? Produk tidak akan muncul di kasir.')
    if (!confirmed) return

    setIsSaving(true)
    try {
      await onDeactivate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menonaktifkan produk.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = async () => {
    if (!onCheckHistory || !onHardDelete) return
    if (deleteStep === 'idle') {
      setDeleteStep('checking')
      try {
        const hasHistory = await onCheckHistory()
        setDeleteStep(hasHistory ? 'confirm-warned' : 'confirm-safe')
      } catch {
        setDeleteStep('idle')
        setError('Gagal memeriksa riwayat produk.')
      }
      return
    }
    if (deleteStep === 'confirm-safe' || deleteStep === 'confirm-warned') {
      setDeleteStep('deleting')
      try {
        await onHardDelete()
        onClose()
      } catch (err) {
        setDeleteStep('idle')
        setError(err instanceof Error ? err.message : 'Gagal menghapus produk.')
      }
    }
  }

  const isBusy = isSaving || deleteStep === 'checking' || deleteStep === 'deleting'
  const generateBarcode = () => {
    const existingBarcodes = new Set(
      products
        .map((product) => product.barcode?.trim())
        .filter((barcode): barcode is string => Boolean(barcode)),
    )
    const barcode = generateInternalBarcode(existingBarcodes)
    setValues((prev) => ({ ...prev, barcode }))
    setBarcodeHint('Barcode internal dibuat. Simpan produk untuk memakai kode ini.')
    barcodeInputRef.current?.focus()
  }

  const inputClass =
    'w-full rounded-md border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-900 dark:text-white px-3 py-2 text-sm focus:border-primary dark:focus:border-primary-400 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={isBusy ? undefined : onClose} />

      {/* Panel */}
      <div
        data-bottom-sheet="true"
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-dark-elevated sm:max-h-[90vh] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated px-5 py-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            {editingId ? 'Edit Produk' : 'Tambah Produk'}
          </h3>
          {!isBusy && (
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

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div ref={errorRef} className="rounded-md bg-danger-50 dark:bg-danger-700/20 px-3 py-2 text-sm text-danger-700 dark:text-danger-500">{error}</div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-dark-muted">
              Nama Produk *
            </label>
            <input
              type="text"
              value={values.name}
              onChange={handleChange('name')}
              placeholder="cth. Kertas A4 80gsm"
              className={inputClass}
              autoFocus
            />
          </div>

          {/* SKU + Barcode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-dark-muted">
                SKU (opsional)
              </label>
              <input
                type="text"
                value={values.sku}
                onChange={handleChange('sku')}
                placeholder="Auto jika kosong"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-dark-muted">
                Barcode (opsional)
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                value={values.barcode}
                onChange={(e) => {
                  setBarcodeHint(null)
                  handleChange('barcode')(e)
                }}
                placeholder="Scan barcode"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                barcodeInputRef.current?.focus()
                setBarcodeHint('Scanner USB/Bluetooth siap. Scan barcode ke kolom barcode.')
              }}
              className="rounded-md border border-neutral-200 dark:border-dark-border px-3 py-2 text-xs font-bold text-neutral-700 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-elevated"
            >
              Scan Barcode
            </button>
            <button
              type="button"
              onClick={generateBarcode}
              className="rounded-md border border-primary-100 dark:border-primary-700 px-3 py-2 text-xs font-bold text-primary dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            >
              Generate Barcode
            </button>
            {barcodeHint && (
              <p className="flex items-center text-xs font-semibold text-neutral-500 dark:text-dark-muted">
                {barcodeHint}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-600 dark:text-dark-muted">Kategori</label>
              {onAddCategory && !showAddCat && (
                <button
                  type="button"
                  onClick={() => { setShowAddCat(true); setAddCatError(null) }}
                  className="text-xs font-semibold text-primary dark:text-primary-400 hover:underline"
                >
                  + Kategori Baru
                </button>
              )}
            </div>
            <select
              value={values.categoryId}
              onChange={handleChange('categoryId')}
              className={inputClass}
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Inline form tambah kategori */}
            {showAddCat && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); void handleAddCatInline() }
                      if (e.key === 'Escape') { setShowAddCat(false); setNewCatName('') }
                    }}
                    placeholder="Nama kategori baru..."
                    autoFocus
                    disabled={addingCat}
                    className="flex-1 rounded-md border border-primary dark:border-primary-400 bg-white dark:bg-dark-card px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-dark-muted focus:outline-none disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddCatInline()}
                    disabled={addingCat || !newCatName.trim()}
                    className="shrink-0 rounded-md bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-50"
                  >
                    {addingCat ? '...' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddCat(false); setNewCatName(''); setAddCatError(null) }}
                    disabled={addingCat}
                    className="shrink-0 text-xs text-neutral-400 dark:text-dark-muted underline"
                  >
                    Batal
                  </button>
                </div>
                {addCatError && (
                  <p className="text-xs text-danger-700 dark:text-danger-500">{addCatError}</p>
                )}
              </div>
            )}
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-dark-muted">
                Harga Jual *
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={values.sellPrice}
                onChange={handleChange('sellPrice')}
                placeholder="0"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-dark-muted">
                Harga Modal
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={values.costPrice}
                onChange={handleChange('costPrice')}
                placeholder="0"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {/* Stock fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-dark-muted">Stok</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={values.stock}
                onChange={handleChange('stock')}
                placeholder="0"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-dark-muted">Stok Min</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={values.minStock}
                onChange={handleChange('minStock')}
                placeholder="0"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-dark-muted">Satuan</label>
              <input
                type="text"
                value={values.unit}
                onChange={handleChange('unit')}
                placeholder="pcs"
                className={inputClass}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={isBusy}
              className="w-full rounded-md bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-800 disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>

            {editingId && onDeactivate && (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isBusy}
                className="w-full rounded-md border border-danger dark:border-danger-600 px-4 py-3 text-sm font-semibold text-danger dark:text-danger-500 transition-colors hover:bg-danger-50 dark:hover:bg-danger-700/20 disabled:opacity-50"
              >
                Nonaktifkan Produk
              </button>
            )}

            {/* Hapus Produk — hanya saat edit, hanya jika prop tersedia */}
            {editingId && onHardDelete && onCheckHistory && (
              <div className="space-y-2 border-t border-neutral-100 pt-2">
                {/* Pesan konfirmasi */}
                {deleteStep === 'confirm-safe' && (
                  <p className="rounded-md bg-neutral-50 dark:bg-dark-elevated px-3 py-2 text-xs text-neutral-700 dark:text-dark-muted">
                    Produk belum pernah dijual. Hapus produk ini secara permanen?
                  </p>
                )}
                {deleteStep === 'confirm-warned' && (
                  <p className="rounded-md bg-warning-50 dark:bg-warning-700/20 px-3 py-2 text-xs text-warning-700 dark:text-warning-500">
                    Produk ini sudah pernah dijual. Riwayat transaksi akan tetap aman
                    (nama tersimpan di struk). Hapus produk ini dari daftar? Aksi ini
                    tidak bisa dibatalkan.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handleDeleteClick()}
                  disabled={isBusy}
                  className="w-full rounded-md border-2 border-danger-500 dark:border-danger-600 px-4 py-2.5 text-sm font-bold text-danger-700 dark:text-danger-500 transition-colors hover:bg-danger-50 dark:hover:bg-danger-700/20 disabled:opacity-50"
                >
                  {deleteStep === 'checking'
                    ? 'Memeriksa...'
                    : deleteStep === 'deleting'
                      ? 'Menghapus...'
                      : deleteStep === 'confirm-safe' || deleteStep === 'confirm-warned'
                        ? 'Ya, Hapus Produk Sekarang'
                        : 'Hapus Produk'}
                </button>

                {(deleteStep === 'confirm-safe' || deleteStep === 'confirm-warned') && (
                  <button
                    type="button"
                    onClick={() => setDeleteStep('idle')}
                    className="w-full text-xs text-neutral-400 underline"
                  >
                    Batal hapus
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProductsScreen
// ---------------------------------------------------------------------------

export default function ProductsScreen() {
  const { products, categories, isLoading, error, loadProducts, loadCategories, addProduct, updateProduct, toggleActive, deleteProduct } =
    useProductStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formInitialValues, setFormInitialValues] = useState<ProductFormValues>(DEFAULT_FORM_VALUES)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportPanel, setShowImportPanel] = useState(false)
  const csvInputRef = useRef<HTMLInputElement | null>(null)

  // ── Tambah / Kurangi Stok ────────────────────────────────────────────────
  const [restockProduct, setRestockProduct] = useState<Product | null>(null)
  const [restockMode, setRestockMode] = useState<'tambah' | 'kurangi'>('tambah')
  const [restockQty, setRestockQty] = useState('')
  const [restockNote, setRestockNote] = useState('')
  const [restocking, setRestocking] = useState(false)
  const [restockDone, setRestockDone] = useState<string | null>(null)

  // ── Produk Nonaktif ──────────────────────────────────────────────────────
  const [inactiveProducts, setInactiveProducts] = useState<Product[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [reactivating, setReactivating] = useState<string | null>(null)

  useEffect(() => {
    void loadProducts()
    void loadCategories()
  }, [loadProducts, loadCategories])

  // Load produk nonaktif
  const loadInactiveProducts = async () => {
    try {
      const all = await db.products.toArray()
      setInactiveProducts(all.filter((p) => !p.isActive))
    } catch { /* non-critical */ }
  }

  useEffect(() => {
    void loadInactiveProducts()
  }, [])

  // Tambah kategori baru inline dari form produk
  const handleAddCategory = async (name: string): Promise<string> => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Nama kategori tidak boleh kosong.')
    const existing = categories.find(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (existing) return existing.id   // kembalikan id yang sudah ada, auto-select
    const now = new Date().toISOString()
    const id = generateId('cat')
    await categoryRepo.create({
      id,
      name: trimmed,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local_only',
      syncVersion: 1,
    })
    await loadCategories()
    return id
  }

  const openEditForm = (product: Product) => {
    setEditingProduct(product)
    setFormInitialValues(productToFormValues(product))
    setIsFormOpen(true)
  }

  const openRestock = (product: Product, mode: 'tambah' | 'kurangi' = 'tambah') => {
    setRestockProduct(product)
    setRestockMode(mode)
    setRestockQty('')
    setRestockNote('')
    setRestockDone(null)
  }

  const handleRestock = async () => {
    if (!restockProduct) return
    const qty = Math.floor(Number(restockQty))
    if (!Number.isFinite(qty) || qty <= 0) return
    if (restockMode === 'kurangi' && qty > restockProduct.stock) return
    setRestocking(true)
    try {
      const now = new Date().toISOString()
      const qtyBefore = restockProduct.stock
      const isAdd = restockMode === 'tambah'
      const qtyAfter = isAdd ? qtyBefore + qty : Math.max(0, qtyBefore - qty)
      await db.transaction('rw', [db.products, db.stockMovements], async () => {
        await db.products.update(restockProduct.id, {
          stock: qtyAfter,
          updatedAt: now,
          syncStatus: 'local_only' as const,
        })
        await db.stockMovements.add({
          id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          productId: restockProduct.id,
          type: isAdd ? ('purchase' as const) : ('adjustment' as const),
          qtyChange: isAdd ? qty : -qty,
          qtyBefore,
          qtyAfter,
          notes: restockNote.trim() || undefined,
          createdAt: now,
        })
      })
      await loadProducts()
      const verb = isAdd ? 'bertambah' : 'berkurang'
      setRestockDone(`Stok ${restockProduct.name} ${verb} ${qty} → total ${qtyAfter} ${restockProduct.unit}`)
      setRestockQty('')
      setRestockNote('')
      setTimeout(() => {
        setRestockProduct(null)
        setRestockDone(null)
      }, 2000)
    } finally {
      setRestocking(false)
    }
  }

  const handleReactivate = async (product: Product) => {
    setReactivating(product.id)
    try {
      await toggleActive(product.id)
      setInactiveProducts((prev) => prev.filter((p) => p.id !== product.id))
    } catch { /* ignore */ } finally {
      setReactivating(null)
    }
  }

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId || products.length === 0) return
    const product = products.find((p) => p.id === editId)
    if (product) {
      openEditForm(product)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, products, setSearchParams])

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    const matchCategory = !selectedCategory || p.categoryId === selectedCategory
    return matchSearch && matchCategory
  })

  const openAddForm = () => {
    setEditingProduct(null)
    setFormInitialValues(DEFAULT_FORM_VALUES)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingProduct(null)
  }

  const handleSubmit = async (values: ProductFormValues) => {
    const allProducts = await db.products.toArray()
    const sku = values.sku.trim()
    const barcode = values.barcode.trim()
    if (
      sku &&
      allProducts.some((product) => product.id !== editingProduct?.id && product.sku.trim() === sku)
    ) {
      throw new Error('SKU sudah dipakai produk lain.')
    }
    if (
      barcode &&
      allProducts.some(
        (product) => product.id !== editingProduct?.id && product.barcode?.trim() === barcode,
      )
    ) {
      throw new Error('Barcode sudah dipakai produk lain.')
    }

    // Helper: parse angka dari string (strip karakter non-numerik kecuali titik)
    const parseNum = (str: string, fallback = 0): number => {
      const n = Number(str.replace(/[^0-9]/g, ''))
      return Number.isFinite(n) && n >= 0 ? n : fallback
    }

    if (editingProduct) {
      const input: UpdateProductInput = {
        name: values.name.trim(),
        barcode: barcode || undefined,
        categoryId: values.categoryId || undefined,
        sellPrice: parseNum(values.sellPrice),
        costPrice: parseNum(values.costPrice),
        stock: parseNum(values.stock),
        minStock: parseNum(values.minStock),
        unit: values.unit.trim() || 'pcs',
      }
      if (sku) {
        input.sku = sku
      }
      await updateProduct(editingProduct.id, input)
    } else {
      const input: CreateProductInput = {
        name: values.name.trim(),
        sku: sku || undefined,
        barcode: barcode || undefined,
        categoryId: values.categoryId || undefined,
        sellPrice: parseNum(values.sellPrice),
        costPrice: parseNum(values.costPrice),
        stock: parseNum(values.stock),
        minStock: parseNum(values.minStock),
        unit: values.unit.trim() || 'pcs',
      }
      await addProduct(input)
    }
  }

  const handleDeactivate = async () => {
    if (editingProduct) {
      await toggleActive(editingProduct.id)
      await loadInactiveProducts()
    }
  }

  const handleCheckHistory = async (): Promise<boolean> => {
    if (!editingProduct) return false
    return deleteUseCase.checkHistory(editingProduct.id)
  }

  const handleHardDelete = async (): Promise<void> => {
    if (!editingProduct) return
    await deleteProduct(editingProduct.id)
  }

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setIsImporting(true)
    setImportError(null)
    setImportSummary(null)
    const summary: ImportSummary = { success: 0, failed: 0, duplicate: 0 }

    try {
      const rows = parseCsv(await file.text())
      const header = rows[0]?.map((value) => value.trim())
      if (!header) {
        throw new Error('File CSV kosong.')
      }

      const missingHeaders = PRODUCT_CSV_HEADERS.filter((name) => !header.includes(name))
      if (missingHeaders.length > 0) {
        throw new Error(`Kolom CSV kurang: ${missingHeaders.join(', ')}`)
      }

      const col = (name: string) => header.indexOf(name)
      const allProducts = await db.products.toArray()
      const existingSkus = new Set(allProducts.map((product) => product.sku.trim()).filter(Boolean))
      const existingBarcodes = new Set(
        allProducts.map((product) => product.barcode?.trim()).filter((value): value is string => Boolean(value)),
      )
      const categoryByName = new Map(
        categories.map((category) => [category.name.trim().toLowerCase(), category.id]),
      )

      for (const row of rows.slice(1)) {
        const name = row[col('name')]?.trim() ?? ''
        const sku = row[col('sku')]?.trim() ?? ''
        const barcode = row[col('barcode')]?.trim() ?? ''
        const categoryName = row[col('category')]?.trim().toLowerCase() ?? ''
        const sellPrice = parseNumber(row[col('sellPrice')])

        if (!name || sellPrice <= 0) {
          summary.failed += 1
          continue
        }
        if ((sku && existingSkus.has(sku)) || (barcode && existingBarcodes.has(barcode))) {
          summary.duplicate += 1
          continue
        }

        const created = await addProduct({
          name,
          sku: sku || undefined,
          barcode: barcode || undefined,
          categoryId: categoryName ? categoryByName.get(categoryName) : undefined,
          costPrice: parseNumber(row[col('costPrice')]),
          sellPrice,
          stock: parseNumber(row[col('stock')]),
          minStock: parseNumber(row[col('minStock')]),
          unit: row[col('unit')]?.trim() || 'pcs',
        })

        if (!parseBoolean(row[col('isActive')], true)) {
          await toggleActive(created.id)
        }
        if (sku) existingSkus.add(sku)
        if (barcode) existingBarcodes.add(barcode)
        summary.success += 1
      }

      setImportSummary(summary)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import CSV gagal.')
    } finally {
      setIsImporting(false)
    }
  }

  const getCategoryName = (categoryId?: string): string => {
    if (!categoryId) return ''
    return categories.find((c) => c.id === categoryId)?.name ?? ''
  }

  return (
    <section className="space-y-4 pb-4">
      {/* Page header */}
      <PageHeader eyebrow="Master Data" title="Produk" icon="package" />

      {/* Error state */}
      {error && (
        <div className="rounded-xl bg-danger-50 dark:bg-danger-700/20 px-3 py-2 text-sm text-danger-700 dark:text-danger-500">{error}</div>
      )}

      {/* Impor / Ekspor CSV — collapsible, default tertutup */}
      <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card">
        <button
          type="button"
          onClick={() => setShowImportPanel((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-white">
            <Icon name="upload" size={16} className="text-primary-500" /> Impor / Ekspor CSV
          </span>
          <Icon
            name="chevron-down"
            size={16}
            className={`text-neutral-400 transition-transform dark:text-dark-muted ${showImportPanel ? 'rotate-180' : ''}`}
          />
        </button>

        {showImportPanel && (
          <div className="border-t border-neutral-100 dark:border-dark-border px-4 pb-4 pt-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={downloadProductCsvTemplate}
                className="rounded-md border border-neutral-200 dark:border-dark-border px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-elevated"
              >
                Download Template CSV
              </button>
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                disabled={isImporting}
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
              >
                {isImporting ? 'Mengimport...' : 'Import CSV Produk'}
              </button>
            </div>
            {importSummary && (
              <p className="mt-3 text-sm text-neutral-600 dark:text-dark-muted">
                Import selesai: {importSummary.success} berhasil, {importSummary.duplicate} duplikat,{' '}
                {importSummary.failed} gagal.
              </p>
            )}
            {importError && <p className="mt-3 text-sm text-danger-700 dark:text-danger-500">{importError}</p>}
          </div>
        )}

        {/* Input file tetap tersembunyi, tidak terpengaruh oleh toggle */}
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => void handleCsvImport(e)}
          className="hidden"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, SKU, atau barcode produk..."
          className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-border dark:bg-dark-card dark:text-white dark:placeholder-dark-muted dark:focus:border-primary-400"
        />
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-dark-muted"
        />
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              selectedCategory === null ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-dark-elevated text-neutral-600 dark:text-white'
            }`}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-neutral-100 dark:bg-dark-elevated text-neutral-600 dark:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-neutral-500">Memuat produk...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-8 text-center">
          <p className="text-sm text-neutral-500 dark:text-dark-muted">
            {search || selectedCategory
              ? 'Produk tidak ditemukan. Coba ubah filter pencarian.'
              : 'Belum ada produk. Tap + untuk menambah produk pertama.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((product) => {
            const catName = getCategoryName(product.categoryId)
            return (
              <li key={product.id}>
                <div className="flex items-stretch overflow-hidden rounded-lg border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card transition-colors hover:border-primary/40">
                  {/* Tap area utama → edit produk */}
                  <button
                    type="button"
                    onClick={() => openEditForm(product)}
                    className="min-w-0 flex-1 overflow-hidden p-4 text-left active:bg-neutral-50 dark:active:bg-dark-elevated"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-neutral-900 dark:text-white">{product.name}</p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-dark-muted">
                          {product.sku}
                          {catName ? ` · ${catName}` : ''}
                          {product.barcode ? ` · ${product.barcode}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <p className="font-mono text-sm font-bold text-primary">
                          {formatCurrency(product.sellPrice)}
                        </p>
                        <div className="flex items-center gap-1">
                          <StockBadge stock={product.stock} minStock={product.minStock} />
                          <span className="text-xs text-neutral-400 dark:text-dark-muted">{product.unit}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                  {/* Tombol histori stok */}
                  <Link
                    to={`/laporan/histori-stok?productId=${product.id}`}
                    aria-label={`Histori stok ${product.name}`}
                    className="flex flex-col items-center justify-center gap-0.5 border-l border-neutral-200 dark:border-dark-border px-3 text-neutral-400 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-elevated active:bg-neutral-100 dark:active:bg-dark-elevated"
                  >
                    <Icon name="folder" size={16} />
                    <span className="text-[10px] font-semibold leading-none">Histori</span>
                  </Link>
                  {/* Tombol koreksi stok */}
                  <button
                    type="button"
                    onClick={() => openRestock(product, 'kurangi')}
                    aria-label={`Koreksi stok ${product.name}`}
                    className="flex flex-col items-center justify-center gap-0.5 border-l border-neutral-200 dark:border-dark-border px-2.5 text-neutral-400 dark:text-dark-muted hover:bg-danger-50 dark:hover:bg-danger-700/20 hover:text-danger-700 dark:hover:text-danger-500 active:bg-danger-100"
                  >
                    <Icon name="edit" size={16} />
                    <span className="text-[10px] font-semibold leading-none">Koreks</span>
                  </button>
                  {/* Tombol restock */}
                  <button
                    type="button"
                    onClick={() => openRestock(product, 'tambah')}
                    aria-label={`Tambah stok ${product.name}`}
                    className="flex flex-col items-center justify-center gap-0.5 border-l border-neutral-200 dark:border-dark-border px-3.5 text-primary dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 active:bg-primary-100 dark:active:bg-primary-900/30"
                  >
                    <Icon name="plus" size={18} strokeWidth={2.5} />
                    <span className="text-[10px] font-semibold leading-none">Stok</span>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Count */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-center text-xs text-neutral-400 dark:text-dark-muted">
          {filtered.length} produk ditampilkan
        </p>
      )}

      {/* Produk Nonaktif */}
      {!isLoading && inactiveProducts.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card">
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-neutral-500 dark:text-dark-muted">
              <Icon name="x" size={15} className="text-neutral-400" /> Produk Nonaktif ({inactiveProducts.length})
            </span>
            <Icon
              name="chevron-down"
              size={16}
              className={`text-neutral-400 transition-transform dark:text-dark-muted ${showInactive ? 'rotate-180' : ''}`}
            />
          </button>

          {showInactive && (
            <ul className="border-t border-neutral-100 dark:border-dark-border divide-y divide-neutral-100 dark:divide-dark-border">
              {inactiveProducts.map((p) => {
                const catName = getCategoryName(p.categoryId)
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-neutral-700 dark:text-dark-muted line-through">{p.name}</p>
                      <p className="text-xs text-neutral-400 dark:text-dark-muted">
                        {p.sku}{catName ? ` · ${catName}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleReactivate(p)}
                      disabled={reactivating === p.id}
                      className="shrink-0 rounded-lg bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 text-xs font-bold text-primary dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 disabled:opacity-50"
                    >
                      {reactivating === p.id ? '...' : 'Aktifkan'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={openAddForm}
        aria-label="Tambah Produk"
        data-fixed-bottom-action="true"
        data-floating-action="true"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow transition-all hover:brightness-110 active:scale-95 sm:bottom-8 sm:right-8"
      >
        <Icon name="plus" size={26} strokeWidth={2.5} />
      </button>

      {/* Form Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        initialValues={formInitialValues}
        editingId={editingProduct?.id ?? null}
        categories={categories}
        products={products}
        onClose={closeForm}
        onSubmit={handleSubmit}
        onDeactivate={editingProduct ? handleDeactivate : undefined}
        onCheckHistory={editingProduct ? handleCheckHistory : undefined}
        onHardDelete={editingProduct ? handleHardDelete : undefined}
        onAddCategory={handleAddCategory}
      />

      {/* Restock Sheet */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={restocking ? undefined : () => setRestockProduct(null)}
          />

          {/* Panel */}
          <div data-bottom-sheet="true" className="relative w-full max-w-lg space-y-4 rounded-t-2xl bg-white dark:bg-dark-elevated p-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-neutral-500 dark:text-dark-muted">Manajemen Stok</p>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">{restockProduct.name}</h3>
              </div>
              {!restocking && (
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  data-android-back-close="true"
                  className="text-sm font-medium text-neutral-500 dark:text-dark-muted hover:text-neutral-800 dark:hover:text-white"
                >
                  Batal
                </button>
              )}
            </div>

            {/* Tab Tambah / Kurangi */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 dark:bg-dark-card p-1">
              <button
                type="button"
                onClick={() => { setRestockMode('tambah'); setRestockQty(''); setRestockDone(null) }}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  restockMode === 'tambah'
                    ? 'bg-white dark:bg-dark-elevated text-primary shadow-sm'
                    : 'text-neutral-500 dark:text-dark-muted'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Icon name="plus" size={16} /> Tambah
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setRestockMode('kurangi'); setRestockQty(''); setRestockDone(null) }}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  restockMode === 'kurangi'
                    ? 'bg-white dark:bg-dark-elevated text-danger-700 dark:text-danger-500 shadow-sm'
                    : 'text-neutral-500 dark:text-dark-muted'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Icon name="edit" size={15} /> Koreksi
                </span>
              </button>
            </div>

            {/* Stok saat ini */}
            <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-dark-card px-4 py-3">
              <span className="text-sm text-neutral-500 dark:text-dark-muted">Stok saat ini</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {restockProduct.stock} {restockProduct.unit}
              </span>
            </div>

            {restockMode === 'kurangi' && (
              <div className="flex items-start gap-2 rounded-xl bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:bg-warning-700/15 dark:text-warning-500">
                <Icon name="edit" size={14} className="mt-0.5 shrink-0" />
                <span>Koreksi untuk barang rusak, hilang, atau salah hitung. Tercatat sebagai penyesuaian stok.</span>
              </div>
            )}

            {/* Success state */}
            {restockDone ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-success-50 px-4 py-3 text-center text-sm font-semibold text-success-700 dark:bg-success-700/20 dark:text-success-400">
                <Icon name="check-circle" size={18} /> {restockDone}
              </div>
            ) : (
              <>
                {/* Input jumlah */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-dark-muted">
                    Jumlah {restockMode === 'tambah' ? 'Tambah' : 'Kurangi'} *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    placeholder={`cth. 50 (${restockProduct.unit})`}
                    autoFocus
                    className={`w-full rounded-md border bg-white dark:bg-dark-card px-3 py-2 font-mono text-sm text-neutral-900 dark:text-white focus:outline-none ${
                      restockMode === 'kurangi'
                        ? 'border-danger-100 dark:border-danger-700/50 focus:border-danger-500 dark:focus:border-danger-500'
                        : 'border-neutral-300 dark:border-dark-border focus:border-primary dark:focus:border-primary-400'
                    }`}
                  />
                  {restockMode === 'kurangi' && (() => {
                    const qty = Math.floor(Number(restockQty))
                    if (Number.isFinite(qty) && qty > restockProduct.stock) {
                      return (
                        <p className="mt-1 text-xs text-danger-700 dark:text-danger-500">
                          Melebihi stok tersedia ({restockProduct.stock} {restockProduct.unit})
                        </p>
                      )
                    }
                    return null
                  })()}
                </div>

                {/* Catatan */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-dark-muted">
                    Catatan {restockMode === 'tambah' ? '(opsional)' : '*'}
                  </label>
                  <input
                    type="text"
                    value={restockNote}
                    onChange={(e) => setRestockNote(e.target.value)}
                    placeholder={restockMode === 'tambah' ? 'cth. Beli dari Toko ABC' : 'cth. Barang rusak, koreksi stok opname'}
                    className="w-full rounded-md border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-primary dark:focus:border-primary-400 focus:outline-none"
                  />
                </div>

                {/* Preview hasil */}
                {(() => {
                  const qty = Math.floor(Number(restockQty))
                  if (Number.isFinite(qty) && qty > 0) {
                    const after = restockMode === 'tambah'
                      ? restockProduct.stock + qty
                      : Math.max(0, restockProduct.stock - qty)
                    const sign = restockMode === 'tambah' ? '+' : '-'
                    return (
                      <p className="text-sm text-neutral-500 dark:text-dark-muted">
                        Stok setelah {restockMode === 'tambah' ? 'tambah' : 'koreksi'}:{' '}
                        <strong className="text-neutral-900 dark:text-white">
                          {restockProduct.stock} {sign} {qty} = {after} {restockProduct.unit}
                        </strong>
                      </p>
                    )
                  }
                  return null
                })()}

                <button
                  type="button"
                  onClick={() => void handleRestock()}
                  disabled={
                    restocking ||
                    !restockQty.trim() ||
                    Math.floor(Number(restockQty)) <= 0 ||
                    (restockMode === 'kurangi' && Math.floor(Number(restockQty)) > restockProduct.stock)
                  }
                  className={`w-full rounded-md px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                    restockMode === 'kurangi'
                      ? 'bg-danger-600 hover:bg-danger-700'
                      : 'bg-primary hover:bg-primary-800'
                  }`}
                >
                  {restocking ? 'Menyimpan...' : restockMode === 'tambah' ? 'Tambah Stok' : 'Simpan Koreksi'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
