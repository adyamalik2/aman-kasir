import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import type { AppTheme } from '@/store/appStore'
import { useProductStore } from '@/store/productStore'
import { getStoreProfile, setStoreProfile, STORE_PROFILE_KEY } from '@/lib/storeProfile'
import { markLocalDataChanged } from '@/lib/storage'
import type { StoreProfile } from '@/lib/storeProfile'
import { generateId } from '@/lib/id-generator'
import { db } from '@/infra/db/dexie'
import { DexieCategoryRepository } from '@/repositories/implementations/DexieCategoryRepository'

const categoryRepo = new DexieCategoryRepository()

// Nama kategori seed — digunakan untuk identifikasi data demo
const SEED_CATEGORY_NAMES = [
  'Alat Tulis',
  'Kertas & Buku',
  'Fotokopi & Print',
  'Perlengkapan Kantor',
  'Lainnya',
]

export default function SettingsScreen() {
  const setStoreName = useAppStore((s) => s.setStoreName)
  const markLocalChange = useAppStore((s) => s.markLocalChange)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  // ── Profil Toko ───────────────────────────────────────────────────────────
  const [form, setForm] = useState<StoreProfile>(() => getStoreProfile())
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const handleChange = (field: keyof StoreProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    const trimmed: StoreProfile = {
      namaToko: form.namaToko.trim() || 'Toko Saya',
      slogan: form.slogan.trim(),
      alamat: form.alamat.trim(),
      nomorTelepon: form.nomorTelepon.trim(),
      namaPemilik: form.namaPemilik.trim(),
    }
    setStoreProfile(trimmed)
    setStoreName(trimmed.namaToko)
    setForm(trimmed)
    markLocalChange('Profil toko diperbarui')
    setToast('Profil toko disimpan')
  }

  // ── Hapus Data Demo ───────────────────────────────────────────────────────
  const [demoConfirm, setDemoConfirm] = useState(0)
  const [demoStatus, setDemoStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [demoMessage, setDemoMessage] = useState<string | null>(null)

  const handleDeleteDemo = async () => {
    if (demoConfirm < 1) {
      setDemoConfirm(1)
      return
    }
    setDemoStatus('loading')
    setDemoMessage(null)
    try {
      // Cari produk seed (SKU PRD-00001 hingga PRD-00009)
      const seedProducts = await db.products
        .filter((p) => p.sku.startsWith('PRD-000'))
        .toArray()
      const seedProductIds = new Set(seedProducts.map((p) => p.id))

      // Cari kategori seed berdasarkan nama
      const seedCategories = await db.categories
        .filter((c) => SEED_CATEGORY_NAMES.includes(c.name))
        .toArray()
      const seedCategoryIds = new Set(seedCategories.map((c) => c.id))

      // Cari kategori seed yang TIDAK dipakai produk non-seed
      const allProducts = await db.products.toArray()
      const nonSeedCategoryIds = new Set(
        allProducts
          .filter((p) => !seedProductIds.has(p.id) && p.categoryId)
          .map((p) => p.categoryId as string),
      )
      const deletableCategoryIds = [...seedCategoryIds].filter(
        (id) => !nonSeedCategoryIds.has(id),
      )

      await db.transaction(
        'rw',
        [db.products, db.categories, db.stockMovements],
        async () => {
          // Hapus produk seed
          await db.products.bulkDelete([...seedProductIds])
          // Hapus stock movements produk seed
          await db.stockMovements
            .filter((m) => seedProductIds.has(m.productId))
            .delete()
          // Hapus kategori seed yang sudah tidak digunakan
          if (deletableCategoryIds.length > 0) {
            await db.categories.bulkDelete(deletableCategoryIds)
          }
        },
      )

      setDemoStatus('done')
      setDemoMessage(
        `Selesai. ${seedProducts.length} produk demo dan ${deletableCategoryIds.length} kategori dihapus.`,
      )
      markLocalChange('Data demo dihapus')
      setDemoConfirm(0)
    } catch (err) {
      setDemoStatus('error')
      setDemoMessage(err instanceof Error ? err.message : 'Gagal menghapus data demo.')
      setDemoConfirm(0)
    }
  }

  // ── Kelola Kategori ───────────────────────────────────────────────────────
  interface CatRow { id: string; name: string; description?: string; activeCount: number }
  const [catRows, setCatRows] = useState<CatRow[]>([])
  const [catLoading, setCatLoading] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [catError, setCatError] = useState<string | null>(null)
  const [catDeleteConfirm, setCatDeleteConfirm] = useState<string | null>(null)
  const loadProductCategories = useProductStore((s) => s.loadCategories)

  const loadCatRows = useCallback(async () => {
    setCatLoading(true)
    try {
      const cats = await categoryRepo.getAll()
      const rows = await Promise.all(
        cats.map(async (c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          activeCount: await categoryRepo.countActiveProducts(c.id),
        })),
      )
      setCatRows(rows.sort((a, b) => a.name.localeCompare(b.name, 'id')))
    } finally {
      setCatLoading(false)
    }
  }, [])

  useEffect(() => { void loadCatRows() }, [loadCatRows])

  const isDupCat = (name: string, excludeId?: string) =>
    catRows.some(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.id !== excludeId,
    )

  const handleAddCat = async () => {
    const name = newCatName.trim()
    if (!name) { setCatError('Nama kategori tidak boleh kosong.'); return }
    if (isDupCat(name)) { setCatError(`Kategori "${name}" sudah ada.`); return }
    setCatError(null)
    const now = new Date().toISOString()
    await categoryRepo.create({
      id: generateId('cat'),
      name,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local_only',
      syncVersion: 1,
    })
    setNewCatName('')
    setAddingCat(false)
    await loadCatRows()
    void loadProductCategories()
    markLocalChange('Kategori ditambahkan')
  }

  const handleStartEdit = (row: CatRow) => {
    setEditingCatId(row.id)
    setEditingCatName(row.name)
    setCatError(null)
  }

  const handleSaveEdit = async () => {
    if (!editingCatId) return
    const name = editingCatName.trim()
    if (!name) { setCatError('Nama kategori tidak boleh kosong.'); return }
    if (isDupCat(name, editingCatId)) { setCatError(`Kategori "${name}" sudah ada.`); return }
    setCatError(null)
    await categoryRepo.update(editingCatId, name)
    setEditingCatId(null)
    await loadCatRows()
    void loadProductCategories()
    markLocalChange('Kategori diperbarui')
  }

  const handleDeleteCat = async (row: CatRow) => {
    if (row.activeCount > 0) {
      setCatError(
        `Kategori "${row.name}" tidak bisa dihapus, masih ada ${row.activeCount} produk aktif. Nonaktifkan atau pindahkan produk dulu.`,
      )
      return
    }
    if (catDeleteConfirm !== row.id) {
      setCatDeleteConfirm(row.id)
      setCatError(null)
      return
    }
    setCatDeleteConfirm(null)
    await categoryRepo.delete(row.id)
    await loadCatRows()
    void loadProductCategories()
    markLocalChange('Kategori dihapus')
  }

  // ── Reset Aplikasi ────────────────────────────────────────────────────────
  const [resetConfirm, setResetConfirm] = useState(0)
  const [resetLoading, setResetLoading] = useState(false)

  const handleReset = async () => {
    if (resetConfirm < 1) {
      setResetConfirm(1)
      return
    }
    setResetLoading(true)
    try {
      // 1. Simpan profil toko agar tidak ikut terhapus
      const savedProfile = localStorage.getItem(STORE_PROFILE_KEY)

      // 2. Hapus semua tabel IndexedDB
      await db.transaction(
        'rw',
        [
          db.products,
          db.categories,
          db.transactions,
          db.transactionItems,
          db.stockMovements,
        ],
        async () => {
          await Promise.all([
            db.products.clear(),
            db.categories.clear(),
            db.transactions.clear(),
            db.transactionItems.clear(),
            db.stockMovements.clear(),
          ])
        },
      )

      // 3. Hapus semua localStorage
      localStorage.clear()

      // 4. Kembalikan profil toko
      if (savedProfile) {
        localStorage.setItem(STORE_PROFILE_KEY, savedProfile)
      }
      markLocalDataChanged('Reset aplikasi')

      // 5. Reload — seed akan berjalan ulang karena DB kosong
      window.location.reload()
    } catch (err) {
      setResetLoading(false)
      setResetConfirm(0)
      console.error('[Reset] Gagal:', err)
    }
  }

  const themeOptions: { value: AppTheme; label: string; icon: string }[] = [
    { value: 'light', label: 'Terang', icon: '☀️' },
    { value: 'dark',  label: 'Gelap',  icon: '🌙' },
    { value: 'system',label: 'Sistem', icon: '📱' },
  ]

  return (
    <section className="space-y-6">
      {/* Header + Back */}
      <div className="flex items-center gap-3">
        <Link
          to="/lainnya"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 dark:border-dark-border text-neutral-500 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-elevated"
          aria-label="Kembali"
        >
          ‹
        </Link>
        <div>
          <p className="text-sm font-medium text-neutral-500 dark:text-dark-muted">Lainnya</p>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Pengaturan</h2>
        </div>
      </div>

      {/* ── Tema Aplikasi ─────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 space-y-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Tema Aplikasi</h3>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                theme === opt.value
                  ? 'border-primary bg-primary-50 dark:bg-primary-900/30 text-primary dark:text-primary-400'
                  : 'border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-elevated text-neutral-500 dark:text-dark-muted hover:border-neutral-300 dark:hover:border-dark-muted'
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <span className="text-xs">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Profil Toko ────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Profil Toko</h3>

        <div className="space-y-3">
          <Field
            label="Nama Toko"
            required
            value={form.namaToko}
            onChange={(v) => handleChange('namaToko', v)}
            placeholder="Toko Saya"
          />
          <Field
            label="Slogan / Tagline"
            value={form.slogan}
            onChange={(v) => handleChange('slogan', v)}
            placeholder="Kasir yang Jalan Terus..."
          />
          <Field
            label="Alamat"
            value={form.alamat}
            onChange={(v) => handleChange('alamat', v)}
            placeholder="Jl. Merdeka No. 1"
            multiline
          />
          <Field
            label="Nomor Telepon"
            value={form.nomorTelepon}
            onChange={(v) => handleChange('nomorTelepon', v)}
            placeholder="08xxxxxxxxxx"
            type="tel"
          />
          <Field
            label="Nama Pemilik"
            value={form.namaPemilik}
            onChange={(v) => handleChange('namaPemilik', v)}
            placeholder="Budi Santoso"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-800 dark:hover:bg-primary-700 transition-colors"
        >
          Simpan
        </button>

        {toast && (
          <div className="rounded-md bg-success-50 dark:bg-success-700/20 px-3 py-2 text-sm font-semibold text-success-700 dark:text-success-400">
            ✓ {toast}
          </div>
        )}
      </div>

      {/* ── Kelola Kategori ──────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 space-y-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Kelola Kategori</h3>

        {catError && (
          <div className="rounded-md bg-danger-50 px-3 py-2 text-xs text-danger-700">{catError}</div>
        )}

        {catLoading ? (
          <p className="py-4 text-center text-sm text-neutral-400 dark:text-dark-muted">Memuat...</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-dark-border">
            {catRows.map((row) => (
              <li key={row.id} className="py-2.5">
                {editingCatId === row.id ? (
                  /* Inline edit */
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleSaveEdit()
                        if (e.key === 'Escape') setEditingCatId(null)
                      }}
                      className="flex-1 rounded-md border border-primary dark:border-primary-400 bg-white dark:bg-dark-elevated px-2 py-1 text-sm text-neutral-900 dark:text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => void handleSaveEdit()}
                      className="text-success-700 dark:text-success-400 hover:text-success-800 text-sm font-bold"
                      title="Simpan"
                    >✓</button>
                    <button
                      type="button"
                      onClick={() => { setEditingCatId(null); setCatError(null) }}
                      className="text-neutral-400 dark:text-dark-muted hover:text-neutral-700 dark:hover:text-white text-sm font-bold"
                      title="Batal"
                    >✕</button>
                  </div>
                ) : (
                  /* Normal row */
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">{row.name}</span>
                      <span className="ml-2 text-xs text-neutral-400 dark:text-dark-muted">
                        {row.activeCount} produk aktif
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {catDeleteConfirm === row.id && (
                        <span className="mr-1 text-xs text-danger-600 dark:text-danger-400">Hapus?</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(row)}
                        className="rounded p-1 text-neutral-500 dark:text-dark-muted hover:bg-neutral-100 dark:hover:bg-dark-elevated"
                        title="Edit"
                      >✏️</button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteCat(row)}
                        className={`rounded p-1 text-sm ${
                          catDeleteConfirm === row.id
                            ? 'bg-danger-100 dark:bg-danger-700/30 text-danger-700 dark:text-danger-400 font-bold'
                            : 'text-neutral-500 dark:text-dark-muted hover:bg-neutral-100 dark:hover:bg-dark-elevated'
                        }`}
                        title="Hapus"
                      >🗑️</button>
                      {catDeleteConfirm === row.id && (
                        <button
                          type="button"
                          onClick={() => setCatDeleteConfirm(null)}
                          className="text-xs text-neutral-400 dark:text-dark-muted underline"
                        >Batal</button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Form tambah kategori */}
        {addingCat ? (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddCat()
                if (e.key === 'Escape') { setAddingCat(false); setNewCatName('') }
              }}
              placeholder="Nama kategori baru"
              className="flex-1 rounded-md border border-primary dark:border-primary-400 bg-white dark:bg-dark-elevated px-2 py-1.5 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-dark-muted focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => void handleAddCat()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-800"
            >Tambah</button>
            <button
              type="button"
              onClick={() => { setAddingCat(false); setNewCatName(''); setCatError(null) }}
              className="text-xs text-neutral-400 dark:text-dark-muted underline"
            >Batal</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setAddingCat(true); setCatError(null) }}
            className="mt-1 w-full rounded-md border border-dashed border-neutral-300 dark:border-dark-border py-2 text-sm font-semibold text-neutral-500 dark:text-dark-muted hover:border-primary dark:hover:border-primary-400 hover:text-primary dark:hover:text-primary-400"
          >
            + Tambah Kategori
          </button>
        )}
      </div>

      {/* ── Data & Reset ──────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Data & Reset</h3>

        {/* Hapus Data Demo */}
        <div className="space-y-2">
          <p className="text-xs text-neutral-500 dark:text-dark-muted">
            Hapus produk bawaan aplikasi (Kertas A4, Fotokopi, dll.) beserta stok awalnya.
            Transaksi dan produk buatan sendiri tidak terpengaruh.
          </p>
          <button
            type="button"
            onClick={() => void handleDeleteDemo()}
            disabled={demoStatus === 'loading'}
            className="w-full rounded-md border-2 border-warning-400 dark:border-warning-600 px-4 py-3 text-sm font-bold text-warning-700 dark:text-warning-400 hover:bg-warning-50 dark:hover:bg-warning-700/10 disabled:opacity-60"
          >
            {demoStatus === 'loading'
              ? 'Menghapus...'
              : demoConfirm < 1
                ? 'Hapus Data Demo'
                : 'Ketuk lagi untuk konfirmasi'}
          </button>
          {demoMessage && (
            <p
              className={`text-sm ${
                demoStatus === 'error' ? 'text-danger-700 dark:text-danger-400' : 'text-neutral-700 dark:text-white'
              }`}
            >
              {demoMessage}
            </p>
          )}
        </div>

        <hr className="border-neutral-100 dark:border-dark-border" />

        {/* Reset Aplikasi */}
        <div className="space-y-2">
          <p className="text-xs text-neutral-500 dark:text-dark-muted">
            Hapus <strong>semua</strong> data (produk, transaksi, riwayat stok) dan reset
            aplikasi ke kondisi awal. Profil toko tetap disimpan. Tindakan ini tidak dapat
            dibatalkan.
          </p>
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={resetLoading}
            className="w-full rounded-md border-2 border-danger-500 dark:border-danger-600 px-4 py-3 text-sm font-bold text-danger-700 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-700/10 disabled:opacity-60"
          >
            {resetLoading
              ? 'Mereset...'
              : resetConfirm < 1
                ? 'Reset Aplikasi'
                : '⚠ Ketuk lagi — semua data akan dihapus'}
          </button>
          {resetConfirm >= 1 && !resetLoading && (
            <button
              type="button"
              onClick={() => setResetConfirm(0)}
              className="w-full text-xs text-neutral-500 dark:text-dark-muted underline"
            >
              Batal
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Komponen bantu ────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  type?: string
  multiline?: boolean
}

function Field({ label, value, onChange, placeholder, required, type, multiline }: FieldProps) {
  const baseClass =
    'mt-1 block w-full rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-dark-muted focus:border-primary dark:focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-primary-400'

  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-600 dark:text-dark-muted">
        {label}
        {required && <span className="ml-1 text-danger-500">*</span>}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={baseClass}
        />
      ) : (
        <input
          type={type ?? 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
    </div>
  )
}
