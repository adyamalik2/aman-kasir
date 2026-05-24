import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { Customer } from '@/domain'
import { DexieCustomerRepository } from '@/repositories/implementations/DexieCustomerRepository'
import { generateId } from '@/lib/id-generator'
import { hapticSuccess, hapticWarning } from '@/native/haptics'

const repo = new DexieCustomerRepository()

const EMPTY_FORM = { nama: '', telepon: '', alamat: '', catatan: '' }

// ---------------------------------------------------------------------------

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Form tambah / edit
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Konfirmasi hapus
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = searchQuery.trim()
        ? await repo.search(searchQuery)
        : await repo.getAll()
      setCustomers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data pelanggan.')
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => { void load() }, [load])

  const openAdd = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (c: Customer) => {
    setEditingId(c.id)
    setForm({ nama: c.nama, telepon: c.telepon, alamat: c.alamat, catatan: c.catatan })
    setFormError(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nama.trim()) {
      setFormError('Nama pelanggan tidak boleh kosong.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const now = new Date().toISOString()
      if (editingId) {
        const existing = await repo.getById(editingId)
        if (!existing) throw new Error('Data tidak ditemukan.')
        await repo.update({
          ...existing,
          nama: form.nama.trim(),
          telepon: form.telepon.trim(),
          alamat: form.alamat.trim(),
          catatan: form.catatan.trim(),
          updatedAt: now,
        })
      } else {
        await repo.create({
          id: generateId('cust'),
          nama: form.nama.trim(),
          telepon: form.telepon.trim(),
          alamat: form.alamat.trim(),
          catatan: form.catatan.trim(),
          syncStatus: 'local_only',
          syncVersion: 1,
          createdAt: now,
          updatedAt: now,
        })
      }
      await hapticSuccess()
      setShowForm(false)
      setEditingId(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await repo.delete(deleteTarget.id)
      await hapticWarning()
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus pelanggan.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/lainnya"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
          aria-label="Kembali"
        >
          ‹
        </Link>
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-500">Lainnya</p>
          <h2 className="text-2xl font-bold text-neutral-900">Pelanggan</h2>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-800"
        >
          + Tambah
        </button>
      </div>

      {/* Search */}
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Cari nama atau telepon..."
        className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
      />

      {error && (
        <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
      )}

      {/* Daftar pelanggan */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl">👤</p>
          <p className="mt-2 font-semibold text-neutral-700">
            {searchQuery ? 'Tidak ada pelanggan ditemukan' : 'Belum ada pelanggan'}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            {searchQuery ? 'Coba kata kunci lain' : 'Ketuk "+ Tambah" untuk menambah pelanggan baru'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-surface px-4 py-3"
            >
              {/* Avatar inisial */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary">
                {c.nama.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-900 truncate">{c.nama}</p>
                {c.telepon && (
                  <p className="text-xs text-neutral-500">{c.telepon}</p>
                )}
                {c.catatan && (
                  <p className="text-xs text-neutral-400 truncate">{c.catatan}</p>
                )}
              </div>

              {/* Aksi */}
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(c)}
                  className="rounded-lg p-2 text-neutral-500 hover:bg-danger-50 hover:text-danger-700"
                  title="Hapus"
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Bottom sheet: Form tambah / edit ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-lg rounded-t-2xl bg-white sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h3 className="font-bold text-neutral-900">
                {editingId ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
              </h3>
              {!saving && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-sm text-neutral-500"
                >
                  Batal
                </button>
              )}
            </div>

            <div className="space-y-3 p-5">
              {formError && (
                <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
                  {formError}
                </div>
              )}

              <FormField
                label="Nama *"
                value={form.nama}
                onChange={(v) => setForm((f) => ({ ...f, nama: v }))}
                placeholder="Nama lengkap pelanggan"
                autoFocus
              />
              <FormField
                label="Telepon"
                value={form.telepon}
                onChange={(v) => setForm((f) => ({ ...f, telepon: v }))}
                placeholder="08xxxxxxxxxx"
                type="tel"
              />
              <FormField
                label="Alamat"
                value={form.alamat}
                onChange={(v) => setForm((f) => ({ ...f, alamat: v }))}
                placeholder="Alamat (opsional)"
                multiline
              />
              <FormField
                label="Catatan"
                value={form.catatan}
                onChange={(v) => setForm((f) => ({ ...f, catatan: v }))}
                placeholder="Catatan tambahan (opsional)"
              />

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog konfirmasi hapus ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <h3 className="font-bold text-neutral-900">Hapus Pelanggan?</h3>
            <p className="mt-2 text-sm text-neutral-600">
              <span className="font-semibold">{deleteTarget.nama}</span> akan dihapus dari daftar.
              Riwayat transaksi tidak terpengaruh.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="w-full rounded-xl bg-danger-600 py-3 text-sm font-bold text-white hover:bg-danger-700 disabled:opacity-60"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="w-full rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700"
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

// ---------------------------------------------------------------------------
// Sub-komponen
// ---------------------------------------------------------------------------

function FormField({
  label, value, onChange, placeholder, type, multiline, autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  multiline?: boolean
  autoFocus?: boolean
}) {
  const base = 'block w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-600">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={`mt-1 ${base}`}
        />
      ) : (
        <input
          type={type ?? 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`mt-1 ${base}`}
        />
      )}
    </div>
  )
}
