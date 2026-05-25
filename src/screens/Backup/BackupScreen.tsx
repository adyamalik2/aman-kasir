import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth/AuthService'
import { isFirebaseConfigured } from '@/infra/cloud/firebase'
import { formatDate } from '@/lib/date'
import { BackupService } from '@/services/backup/BackupService'
import { RestoreService } from '@/services/backup/RestoreService'
import { CloudBackupService, type CloudBackupMeta } from '@/services/backup/CloudBackupService'
import { CloudRestoreService } from '@/services/backup/CloudRestoreService'
import type { BackupFile, BackupPreview, RestoreMode } from '@/services/backup/types'
import { useProductStore } from '@/store/productStore'
import { useTransactionStore } from '@/store/transactionStore'

const backupService = new BackupService()
const restoreService = new RestoreService()
const cloudBackupService = new CloudBackupService()
const cloudRestoreService = new CloudRestoreService()

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function BackupScreen() {
  const lastBackupAt = useAppStore((s) => s.lastBackupAt)
  const lastCloudBackupAt = useAppStore((s) => s.lastCloudBackupAt)
  const hasLocalChanges = useAppStore((s) => s.hasLocalChanges)
  const lastChangeAt = useAppStore((s) => s.lastChangeAt)
  const lastChangeReason = useAppStore((s) => s.lastChangeReason)
  const { user, isLoggedIn } = useAuthStore()

  // Local backup state
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [backupMessage, setBackupMessage] = useState<string | null>(null)

  // Local restore state
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [pendingFile, setPendingFile] = useState<BackupFile | null>(null)
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge')
  const [confirmStep, setConfirmStep] = useState(0)
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null)

  // Cloud backup state
  const [cloudList, setCloudList] = useState<CloudBackupMeta[]>([])
  const [cloudListLoading, setCloudListLoading] = useState(false)
  const [cloudListError, setCloudListError] = useState<string | null>(null)
  const [cloudUploadStatus, setCloudUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [cloudUploadMessage, setCloudUploadMessage] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Cloud restore state
  const [cloudRestoreTarget, setCloudRestoreTarget] = useState<CloudBackupMeta | null>(null)
  const [cloudRestoreMode, setCloudRestoreMode] = useState<RestoreMode>('merge')
  const [cloudRestoreConfirm, setCloudRestoreConfirm] = useState(0)
  const [cloudRestoreStatus, setCloudRestoreStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [cloudRestoreMessage, setCloudRestoreMessage] = useState<string | null>(null)
  const [loginMessage, setLoginMessage] = useState<string | null>(null)

  const loadProducts = useProductStore((s) => s.loadProducts)
  const loadTransactions = useTransactionStore((s) => s.loadTransactions)
  const loadTodaySummary = useTransactionStore((s) => s.loadTodaySummary)

  // ── Load cloud list ──────────────────────────────────────────────────────
  const fetchCloudList = useCallback(async () => {
    if (!isLoggedIn || !user) return
    setCloudListLoading(true)
    setCloudListError(null)
    try {
      const list = await cloudBackupService.listCloudBackups(user.uid)
      setCloudList(list)
    } catch (err) {
      setCloudListError(err instanceof Error ? err.message : 'Gagal memuat daftar backup cloud.')
    } finally {
      setCloudListLoading(false)
    }
  }, [isLoggedIn, user])

  useEffect(() => {
    if (isLoggedIn) {
      void fetchCloudList()
    } else {
      setCloudList([])
    }
  }, [isLoggedIn, fetchCloudList])

  // ── Local backup ─────────────────────────────────────────────────────────
  const handleLocalBackup = async () => {
    setBackupStatus('loading')
    setBackupMessage(null)
    try {
      const { timestamp } = await backupService.backupNow()
      setBackupStatus('success')
      setBackupMessage(`Backup lokal berhasil — ${formatDate(timestamp)}`)
    } catch (err) {
      setBackupStatus('error')
      setBackupMessage(err instanceof Error ? err.message : 'Backup gagal.')
    }
  }

  // ── Local restore ────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setConfirmStep(0)
    setRestoreMessage(null)
    try {
      const text = await file.text()
      const json: unknown = JSON.parse(text)
      const validation = restoreService.validateBackupFile(json)
      if (!validation.valid || !validation.data) {
        setPreview(null)
        setPendingFile(null)
        setRestoreMessage(validation.error ?? 'File tidak valid.')
        return
      }
      setPendingFile(validation.data)
      setPreview(restoreService.getPreview(validation.data))
    } catch {
      setPreview(null)
      setPendingFile(null)
      setRestoreMessage('Gagal membaca file backup.')
    }
    e.target.value = ''
  }

  const handleLocalRestore = async () => {
    if (!pendingFile) return
    if (confirmStep < 1) {
      setConfirmStep(1)
      return
    }
    setRestoreStatus('loading')
    setRestoreMessage(null)
    const result = await restoreService.restoreFromBackup(pendingFile, restoreMode)
    setRestoreStatus('done')
    if (result.success) {
      const r = result.restored
      setRestoreMessage(
        `Restore berhasil. Produk: ${r.products}, Transaksi: ${r.transactions}, Item: ${r.transaction_items}, Pelanggan: ${r.customers}`,
      )
      setPreview(null)
      setPendingFile(null)
      setConfirmStep(0)
      await Promise.all([loadProducts(), loadTransactions(), loadTodaySummary()])
    } else {
      setRestoreMessage(result.error ?? 'Restore gagal.')
      setConfirmStep(0)
    }
  }

  // ── Cloud backup ─────────────────────────────────────────────────────────
  const handleCloudBackup = async () => {
    if (!user) return
    setCloudUploadStatus('loading')
    setCloudUploadMessage(null)
    try {
      const result = await cloudBackupService.uploadBackup(user.uid)
      setCloudUploadStatus('success')
      setCloudUploadMessage(
        `Backup cloud berhasil — ${result.uploadedAt ? formatDate(result.uploadedAt) : ''}`,
      )
      await fetchCloudList()
    } catch (err) {
      setCloudUploadStatus('error')
      setCloudUploadMessage(err instanceof Error ? err.message : 'Backup cloud gagal.')
    }
  }

  const handleDeleteCloud = async (meta: CloudBackupMeta) => {
    if (!user) return
    const confirmed = window.confirm('Hapus backup cloud ini? Aksi ini tidak bisa dibatalkan.')
    if (!confirmed) return

    setDeletingId(meta.id)
    try {
      await cloudBackupService.deleteCloudBackup(user.uid, meta.id)
      setCloudList((prev) => prev.filter((m) => m.id !== meta.id))
    } catch (err) {
      setCloudListError(err instanceof Error ? err.message : 'Gagal menghapus backup cloud.')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Cloud restore ────────────────────────────────────────────────────────
  const handleCloudRestore = async () => {
    if (!cloudRestoreTarget) return
    if (cloudRestoreConfirm < 1) {
      setCloudRestoreConfirm(1)
      return
    }
    if (!user) return
    setCloudRestoreStatus('loading')
    setCloudRestoreMessage(null)
    const result = await cloudRestoreService.restoreFromCloud(user.uid, cloudRestoreTarget, cloudRestoreMode)
    setCloudRestoreStatus('done')
    if (result.success) {
      const r = result.restored
      setCloudRestoreMessage(
        `Restore cloud berhasil. Produk: ${r.products}, Transaksi: ${r.transactions}, Pelanggan: ${r.customers}`,
      )
      setCloudRestoreTarget(null)
      setCloudRestoreConfirm(0)
      await Promise.all([loadProducts(), loadTransactions(), loadTodaySummary()])
    } else {
      setCloudRestoreMessage(result.error ?? 'Restore cloud gagal.')
      setCloudRestoreConfirm(0)
    }
  }

  const handleLogin = async () => {
    setLoginMessage(null)
    try {
      await authService.signInWithGoogle()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login Google gagal.'
      // Jangan tampilkan error jika user sengaja batalkan login
      if (/cancel/i.test(msg)) return
      // Tampilkan pesan singkat yang ramah untuk user
      setLoginMessage('Login Google gagal. Pastikan koneksi internet aktif, lalu coba lagi.')
    }
  }

  const hasAnyBackup = Boolean(lastBackupAt || lastCloudBackupAt)
  const backupSafetyLabel = hasLocalChanges
    ? 'Ada perubahan lokal yang belum dibackup'
    : hasAnyBackup
      ? 'Data terakhir sudah dibackup'
      : 'Belum ada backup'
  const backupSafetyDetail = hasLocalChanges
    ? `${lastChangeReason ?? 'Data lokal berubah'}${
        lastChangeAt ? ` - ${formatDate(lastChangeAt)}` : ''
      }`
    : hasAnyBackup
      ? 'Backup lokal atau cloud sudah pernah berhasil.'
      : 'Buat backup lokal atau cloud untuk mengamankan data.'

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-neutral-500 dark:text-dark-muted">Lainnya</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">Backup & Restore</h2>
      </div>

      <div
        className={`rounded-lg border p-5 ${
          hasLocalChanges
            ? 'border-warning-200 dark:border-warning-700/50 bg-warning-50 dark:bg-warning-700/10'
            : 'border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-dark-muted">Status Data</p>
            <h3 className="mt-1 text-base font-bold text-neutral-900 dark:text-white">{backupSafetyLabel}</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-dark-muted">{backupSafetyDetail}</p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
              hasLocalChanges ? 'bg-warning-100 dark:bg-warning-700/20 text-warning-700 dark:text-warning-500' : 'bg-success-50 dark:bg-success-700/20 text-success-700 dark:text-success-400'
            }`}
          >
            {hasLocalChanges ? 'Perlu Backup' : 'Aman'}
          </span>
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p className="rounded-md bg-white/70 dark:bg-dark-elevated/60 px-3 py-2 text-neutral-600 dark:text-dark-muted">
            Lokal:{' '}
            <span className="font-semibold text-neutral-900 dark:text-white">
              {lastBackupAt ? formatDate(lastBackupAt) : 'Belum pernah'}
            </span>
          </p>
          <p className="rounded-md bg-white/70 dark:bg-dark-elevated/60 px-3 py-2 text-neutral-600 dark:text-dark-muted">
            Cloud:{' '}
            <span className="font-semibold text-neutral-900 dark:text-white">
              {lastCloudBackupAt ? formatDate(lastCloudBackupAt) : 'Belum pernah'}
            </span>
          </p>
        </div>
      </div>

      {/* ── Login & Akun ─────────────────────────────────────────── */}
      {isFirebaseConfigured && (
        <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-5 space-y-3">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Login & Akun</h3>
          {isLoggedIn && user ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                  {user.displayName ?? '—'}
                </p>
                <p className="truncate text-xs text-neutral-500 dark:text-dark-muted">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void authService.signOut()}
                className="shrink-0 rounded-md border border-neutral-200 dark:border-dark-border px-3 py-1.5 text-xs font-semibold text-danger-700 dark:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-700/20"
              >
                Keluar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-neutral-500 dark:text-dark-muted">
                Masuk untuk mengaktifkan backup cloud otomatis.
              </p>
              <button
                type="button"
                onClick={() => void handleLogin()}
                className="w-full rounded-md border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-elevated px-4 py-3 text-sm font-bold text-neutral-700 dark:text-white hover:bg-neutral-50 dark:hover:bg-dark-border"
              >
                Masuk dengan Google
              </button>
              {loginMessage && (
                <p className="rounded-md bg-danger-50 dark:bg-danger-700/20 px-3 py-2 text-sm text-danger-700 dark:text-danger-500">
                  {loginMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Backup Lokal ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Backup Lokal</h3>
        <p className="text-sm text-neutral-500 dark:text-dark-muted">
          Backup terakhir:{' '}
          <span className="font-semibold text-neutral-800 dark:text-white">
            {lastBackupAt ? formatDate(lastBackupAt) : 'Belum pernah'}
          </span>
        </p>
        <button
          type="button"
          onClick={() => void handleLocalBackup()}
          disabled={backupStatus === 'loading'}
          className="w-full rounded-md bg-primary px-4 py-4 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
        >
          {backupStatus === 'loading' ? 'Membuat backup...' : 'Backup Sekarang'}
        </button>
        {backupMessage && (
          <p className={`text-sm ${backupStatus === 'error' ? 'text-danger-700 dark:text-danger-500' : 'text-success-700 dark:text-success-400'}`}>
            {backupMessage}
          </p>
        )}
      </div>

      {/* ── Cloud Backup (hanya jika login) ──────────────────────── */}
      {isFirebaseConfigured && isLoggedIn && user && (
        <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Cloud Backup</h3>
          <p className="text-sm text-neutral-500 dark:text-dark-muted">
            Backup cloud terakhir:{' '}
            <span className="font-semibold text-neutral-800 dark:text-white">
              {lastCloudBackupAt ? formatDate(lastCloudBackupAt) : 'Belum pernah'}
            </span>
          </p>

          <button
            type="button"
            onClick={() => void handleCloudBackup()}
            disabled={cloudUploadStatus === 'loading'}
            className="w-full rounded-md bg-primary px-4 py-4 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
          >
            {cloudUploadStatus === 'loading' ? 'Mengunggah...' : 'Backup ke Cloud'}
          </button>

          {cloudUploadMessage && (
            <p
              className={`text-sm ${
                cloudUploadStatus === 'error' ? 'text-danger-700 dark:text-danger-500' : 'text-success-700 dark:text-success-400'
              }`}
            >
              {cloudUploadMessage}
            </p>
          )}

          {/* Daftar backup cloud */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-dark-muted">Riwayat Cloud</p>
            {cloudListLoading ? (
              <p className="py-4 text-center text-sm text-neutral-400 dark:text-dark-muted">Memuat...</p>
            ) : cloudListError ? (
              <p className="text-sm text-danger-700 dark:text-danger-500">{cloudListError}</p>
            ) : cloudList.length === 0 ? (
              <p className="py-4 text-center text-sm text-neutral-400 dark:text-dark-muted">
                Belum ada backup cloud.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-dark-border">
                {cloudList.map((meta) => (
                  <li key={meta.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-neutral-800 dark:text-white">
                          {formatDate(meta.createdAt)}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-dark-muted">
                          {meta.summary.productCount} produk ·{' '}
                          {meta.summary.transactionCount} transaksi ·{' '}
                          {formatBytes(meta.fileSizeBytes)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCloudRestoreTarget(meta)
                            setCloudRestoreConfirm(0)
                            setCloudRestoreMessage(null)
                            setCloudRestoreStatus('idle')
                          }}
                          className="rounded-md border border-neutral-200 dark:border-dark-border px-2 py-1 text-xs font-semibold text-neutral-700 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-elevated"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCloud(meta)}
                          disabled={deletingId === meta.id}
                          className="rounded-md border border-danger-100 dark:border-danger-700/50 px-2 py-1 text-xs font-semibold text-danger-700 dark:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-700/20 disabled:opacity-50"
                        >
                          {deletingId === meta.id ? '...' : 'Hapus'}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Cloud Restore sheet ───────────────────────────────────── */}
      {cloudRestoreTarget && (
        <div className="rounded-lg border-2 border-warning-300 dark:border-warning-700/50 bg-warning-50 dark:bg-warning-700/10 p-5 space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            Restore dari Cloud: {formatDate(cloudRestoreTarget.createdAt)}
          </h3>
          <p className="text-xs text-neutral-600 dark:text-dark-muted">
            {cloudRestoreTarget.summary.productCount} produk ·{' '}
            {cloudRestoreTarget.summary.transactionCount} transaksi
          </p>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="cloudRestoreMode"
                checked={cloudRestoreMode === 'merge'}
                onChange={() => setCloudRestoreMode('merge')}
              />
              Merge
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="cloudRestoreMode"
                checked={cloudRestoreMode === 'replace'}
                onChange={() => setCloudRestoreMode('replace')}
              />
              Replace
            </label>
          </div>

          {cloudRestoreMode === 'replace' && (
            <p className="text-sm font-semibold text-danger-700 dark:text-danger-500">
              Mode Replace akan menghapus semua data lokal saat ini.
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleCloudRestore()}
              disabled={cloudRestoreStatus === 'loading'}
              className="flex-1 rounded-md border-2 border-danger-500 dark:border-danger-600 px-4 py-3 text-sm font-bold text-danger-700 dark:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-700/20 disabled:opacity-60"
            >
              {cloudRestoreStatus === 'loading'
                ? 'Merestore...'
                : cloudRestoreConfirm < 1
                  ? 'Restore — Ketuk lagi untuk konfirmasi'
                  : 'Konfirmasi Restore Sekarang'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCloudRestoreTarget(null)
                setCloudRestoreConfirm(0)
                setCloudRestoreMessage(null)
              }}
              disabled={cloudRestoreStatus === 'loading'}
              className="rounded-md border border-neutral-200 dark:border-dark-border px-4 py-3 text-sm text-neutral-600 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-elevated disabled:opacity-60"
            >
              Batal
            </button>
          </div>

          {cloudRestoreMessage && (
            <p className="text-sm text-neutral-700 dark:text-dark-muted">{cloudRestoreMessage}</p>
          )}
        </div>
      )}

      {/* ── Restore Lokal ────────────────────────────────────────── */}
      <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Restore dari File Lokal</h3>
        <label className="block">
          <span className="sr-only">Pilih file backup</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => void handleFileSelect(e)}
            className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
          />
        </label>

        {preview && (
          <div className="rounded-md bg-neutral-50 dark:bg-dark-elevated p-3 text-sm text-neutral-700 dark:text-dark-muted space-y-1">
            <p>Preview backup ({formatDate(preview.timestamp)}):</p>
            <ul className="list-inside list-disc text-xs">
              <li>{preview.products} produk</li>
              <li>{preview.categories} kategori</li>
              <li>{preview.transactions} transaksi</li>
              <li>{preview.transaction_items} item transaksi</li>
              <li>{preview.stock_movements} pergerakan stok</li>
              <li>{preview.customers} pelanggan</li>
            </ul>
          </div>
        )}

        {pendingFile && (
          <>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="restoreMode"
                  checked={restoreMode === 'merge'}
                  onChange={() => setRestoreMode('merge')}
                />
                Merge (tambah data baru)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="restoreMode"
                  checked={restoreMode === 'replace'}
                  onChange={() => setRestoreMode('replace')}
                />
                Replace
              </label>
            </div>
            {restoreMode === 'replace' && (
              <p className="text-sm font-semibold text-danger-700 dark:text-danger-500">
                Mode Replace akan menghapus data saat ini.
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleLocalRestore()}
              disabled={restoreStatus === 'loading'}
              className="w-full rounded-md border-2 border-danger-500 dark:border-danger-600 px-4 py-3 text-sm font-bold text-danger-700 dark:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-700/20 disabled:opacity-60"
            >
              {restoreStatus === 'loading'
                ? 'Merestore...'
                : confirmStep < 1
                  ? 'Restore — Ketuk lagi untuk konfirmasi'
                  : 'Konfirmasi Restore Sekarang'}
            </button>
          </>
        )}

        {restoreMessage && (
          <p className="text-sm text-neutral-700 dark:text-dark-muted">{restoreMessage}</p>
        )}
      </div>
    </section>
  )
}
