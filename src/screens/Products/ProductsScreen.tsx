import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProductStore } from '@/store/productStore'
import { DexieProductRepository } from '@/repositories/implementations/DexieProductRepository'
import { DeleteProductUseCase } from '@/usecases/product/DeleteProductUseCase'
import type { Product } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import type { CreateProductInput } from '@/usecases/product/CreateProductUseCase'
import type { UpdateProductInput } from '@/usecases/product/UpdateProductUseCase'

const deleteUseCase = new DeleteProductUseCase(new DexieProductRepository())

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

function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  const isZero = stock === 0
  const isLow = !isZero && minStock > 0 && stock <= minStock

  const colorClass = isZero
    ? 'bg-danger-50 text-danger-700'
    : isLow
      ? 'bg-warning-50 text-warning-700'
      : 'bg-success-50 text-success-700'

  const label = isZero ? 'Habis' : String(stock)

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colorClass}`}>
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
  onClose: () => void
  onSubmit: (values: ProductFormValues) => Promise<void>
  onDeactivate?: () => Promise<void>
  onHardDelete?: () => Promise<void>
  onCheckHistory?: () => Promise<boolean>
}

function ProductFormModal({
  isOpen,
  initialValues,
  editingId,
  categories,
  onClose,
  onSubmit,
  onDeactivate,
  onHardDelete,
  onCheckHistory,
}: ProductFormModalProps) {
  const [values, setValues] = useState<ProductFormValues>(initialValues)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle')

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues)
      setError(null)
      setDeleteStep('idle')
    }
  }, [isOpen, initialValues])

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
    if (!values.sellPrice || Number(values.sellPrice) < 0) {
      setError('Harga jual harus diisi dan tidak boleh negatif.')
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

  const inputClass =
    'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={isBusy ? undefined : onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:max-h-[90vh] sm:rounded-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
          <h3 className="text-base font-bold text-neutral-900">
            {editingId ? 'Edit Produk' : 'Tambah Produk'}
          </h3>
          {!isBusy && (
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
            >
              Batal
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">
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
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
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
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
                Barcode (opsional)
              </label>
              <input
                type="text"
                value={values.barcode}
                onChange={handleChange('barcode')}
                placeholder="Scan barcode"
                className={inputClass}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">Kategori</label>
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
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
                Harga Jual *
              </label>
              <input
                type="number"
                value={values.sellPrice}
                onChange={handleChange('sellPrice')}
                min="0"
                placeholder="0"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
                Harga Modal
              </label>
              <input
                type="number"
                value={values.costPrice}
                onChange={handleChange('costPrice')}
                min="0"
                placeholder="0"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {/* Stock fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">Stok</label>
              <input
                type="number"
                value={values.stock}
                onChange={handleChange('stock')}
                min="0"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">Stok Min</label>
              <input
                type="number"
                value={values.minStock}
                onChange={handleChange('minStock')}
                min="0"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">Satuan</label>
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
                className="w-full rounded-md border border-danger px-4 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger-50 disabled:opacity-50"
              >
                Nonaktifkan Produk
              </button>
            )}

            {/* Hapus Produk — hanya saat edit, hanya jika prop tersedia */}
            {editingId && onHardDelete && onCheckHistory && (
              <div className="space-y-2 border-t border-neutral-100 pt-2">
                {/* Pesan konfirmasi */}
                {deleteStep === 'confirm-safe' && (
                  <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
                    Produk belum pernah dijual. Hapus produk ini secara permanen?
                  </p>
                )}
                {deleteStep === 'confirm-warned' && (
                  <p className="rounded-md bg-warning-50 px-3 py-2 text-xs text-warning-700">
                    Produk ini sudah pernah dijual. Riwayat transaksi akan tetap aman
                    (nama tersimpan di struk). Hapus produk ini dari daftar? Aksi ini
                    tidak bisa dibatalkan.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handleDeleteClick()}
                  disabled={isBusy}
                  className="w-full rounded-md border-2 border-danger-400 px-4 py-2.5 text-sm font-bold text-danger-700 transition-colors hover:bg-danger-50 disabled:opacity-50"
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

  useEffect(() => {
    void loadProducts()
    void loadCategories()
  }, [loadProducts, loadCategories])

  const openEditForm = (product: Product) => {
    setEditingProduct(product)
    setFormInitialValues(productToFormValues(product))
    setIsFormOpen(true)
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
      !search || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
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
    if (editingProduct) {
      const input: UpdateProductInput = {
        name: values.name.trim(),
        barcode: values.barcode.trim() || undefined,
        categoryId: values.categoryId || undefined,
        sellPrice: Number(values.sellPrice) || 0,
        costPrice: Number(values.costPrice) || 0,
        stock: Number(values.stock) || 0,
        minStock: Number(values.minStock) || 0,
        unit: values.unit.trim() || 'pcs',
      }
      if (values.sku.trim()) {
        input.sku = values.sku.trim()
      }
      await updateProduct(editingProduct.id, input)
    } else {
      const input: CreateProductInput = {
        name: values.name.trim(),
        sku: values.sku.trim() || undefined,
        barcode: values.barcode.trim() || undefined,
        categoryId: values.categoryId || undefined,
        sellPrice: Number(values.sellPrice) || 0,
        costPrice: Number(values.costPrice) || 0,
        stock: Number(values.stock) || 0,
        minStock: Number(values.minStock) || 0,
        unit: values.unit.trim() || 'pcs',
      }
      await addProduct(input)
    }
  }

  const handleDeactivate = async () => {
    if (editingProduct) {
      await toggleActive(editingProduct.id)
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

  const getCategoryName = (categoryId?: string): string => {
    if (!categoryId) return ''
    return categories.find((c) => c.id === categoryId)?.name ?? ''
  }

  return (
    <section className="space-y-4 pb-4">
      {/* Page header */}
      <div>
        <p className="text-sm font-medium text-neutral-500">Master Data</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900">Produk</h2>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
      )}

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau SKU produk..."
          className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
          🔍
        </span>
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              selectedCategory === null ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-600'
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
                  : 'bg-neutral-100 text-neutral-600'
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
        <div className="rounded-lg border border-neutral-200 bg-surface p-8 text-center">
          <p className="text-sm text-neutral-500">
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
                <button
                  type="button"
                  onClick={() => openEditForm(product)}
                  className="w-full rounded-lg border border-neutral-200 bg-surface p-4 text-left transition-colors hover:border-primary/40 active:bg-neutral-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-neutral-900">{product.name}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {product.sku}
                        {catName ? ` · ${catName}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <p className="font-mono text-sm font-bold text-primary">
                        {formatCurrency(product.sellPrice)}
                      </p>
                      <div className="flex items-center gap-1">
                        <StockBadge stock={product.stock} minStock={product.minStock} />
                        <span className="text-xs text-neutral-400">{product.unit}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Count */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-center text-xs text-neutral-400">
          {filtered.length} produk ditampilkan
        </p>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={openAddForm}
        aria-label="Tambah Produk"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary-800 sm:bottom-8 sm:right-8"
      >
        <span className="text-2xl leading-none">+</span>
      </button>

      {/* Form Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        initialValues={formInitialValues}
        editingId={editingProduct?.id ?? null}
        categories={categories}
        onClose={closeForm}
        onSubmit={handleSubmit}
        onDeactivate={editingProduct ? handleDeactivate : undefined}
        onCheckHistory={editingProduct ? handleCheckHistory : undefined}
        onHardDelete={editingProduct ? handleHardDelete : undefined}
      />
    </section>
  )
}
