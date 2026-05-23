import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { formatDate } from '@/lib/date'
import { BackupService } from '@/services/backup/BackupService'
import { RestoreService } from '@/services/backup/RestoreService'
import type { BackupFile, BackupPreview, RestoreMode } from '@/services/backup/types'
import { useProductStore } from '@/store/productStore'
import { useTransactionStore } from '@/store/transactionStore'

const backupService = new BackupService()
const restoreService = new RestoreService()

export default function BackupScreen() {
  const lastBackupAt = useAppStore((s) => s.lastBackupAt)
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [pendingFile, setPendingFile] = useState<BackupFile | null>(null)
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge')
  const [confirmStep, setConfirmStep] = useState(0)
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null)

  const loadProducts = useProductStore((s) => s.loadProducts)
  const loadTransactions = useTransactionStore((s) => s.loadTransactions)
  const loadTodaySummary = useTransactionStore((s) => s.loadTodaySummary)

  const handleBackup = async () => {
    setBackupStatus('loading')
    setBackupMessage(null)
    try {
      const { timestamp } = await backupService.backupNow()
      setBackupStatus('success')
      setBackupMessage(`Backup berhasil — ${formatDate(timestamp)}`)
    } catch (err) {
      setBackupStatus('error')
      setBackupMessage(err instanceof Error ? err.message : 'Backup gagal.')
    }
  }

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

  const handleRestore = async () => {
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
        `Restore berhasil. Produk: ${r.products}, Transaksi: ${r.transactions}, Item: ${r.transaction_items}`,
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

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-neutral-500">Lainnya</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900">Backup & Restore</h2>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-surface p-5 space-y-4">
        <h3 className="text-sm font-bold text-neutral-900">Backup</h3>
        <p className="text-sm text-neutral-500">
          Backup terakhir:{' '}
          <span className="font-semibold text-neutral-800">
            {lastBackupAt ? formatDate(lastBackupAt) : 'Belum pernah'}
          </span>
        </p>
        <button
          type="button"
          onClick={() => void handleBackup()}
          disabled={backupStatus === 'loading'}
          className="w-full rounded-md bg-primary px-4 py-4 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
        >
          {backupStatus === 'loading' ? 'Membuat backup...' : 'Backup Sekarang'}
        </button>
        {backupMessage && (
          <p
            className={`text-sm ${backupStatus === 'error' ? 'text-danger-700' : 'text-success-700'}`}
          >
            {backupMessage}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-surface p-5 space-y-4">
        <h3 className="text-sm font-bold text-neutral-900">Restore</h3>
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
          <div className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-700 space-y-1">
            <p>Preview backup ({formatDate(preview.timestamp)}):</p>
            <ul className="list-inside list-disc text-xs">
              <li>{preview.products} produk</li>
              <li>{preview.categories} kategori</li>
              <li>{preview.transactions} transaksi</li>
              <li>{preview.transaction_items} item transaksi</li>
              <li>{preview.stock_movements} pergerakan stok</li>
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
              <p className="text-sm font-semibold text-danger-700">
                Mode Replace akan menghapus data saat ini.
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleRestore()}
              disabled={restoreStatus === 'loading'}
              className="w-full rounded-md border-2 border-danger-500 px-4 py-3 text-sm font-bold text-danger-700 hover:bg-danger-50 disabled:opacity-60"
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
          <p className="text-sm text-neutral-700">{restoreMessage}</p>
        )}
      </div>
    </section>
  )
}
