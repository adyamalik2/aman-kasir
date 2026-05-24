import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { useTransactionStore } from '@/store/transactionStore'
import { isFirebaseConfigured } from '@/infra/cloud/firebase'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { getLowStock } from '@/screens/Reports/reportApi'

export default function DashboardScreen() {
  const isOnline = useAppStore((state) => state.isOnline)
  const lastBackupAt = useAppStore((state) => state.lastBackupAt)
  const lastCloudBackupAt = useAppStore((state) => state.lastCloudBackupAt)
  const hasLocalChanges = useAppStore((state) => state.hasLocalChanges)
  const lastChangeReason = useAppStore((state) => state.lastChangeReason)
  const storeName = useAppStore((state) => state.storeName)
  const { todaySummary, loadTodaySummary } = useTransactionStore()
  const { user, isLoggedIn } = useAuthStore()
  const [lowStockCount, setLowStockCount] = useState(0)

  useEffect(() => {
    void loadTodaySummary()
  }, [loadTodaySummary])

  useEffect(() => {
    getLowStock
      .execute()
      .then((products) => {
        setLowStockCount(products.length)
      })
      .catch(() => {
        // Non-critical: biarkan gagal diam-diam
      })
  }, [])

  // Label status backup
  const backupStatusLabel = hasLocalChanges
    ? 'Belum dibackup'
    : lastBackupAt || lastCloudBackupAt
      ? 'Sudah aman'
      : 'Belum ada backup'

  const backupDetailLabel = hasLocalChanges
    ? (lastChangeReason ?? 'Ada perubahan lokal')
    : lastBackupAt
      ? `Lokal: ${formatDate(lastBackupAt)}`
      : lastCloudBackupAt
        ? `Cloud: ${formatDate(lastCloudBackupAt)}`
        : 'Ketuk untuk backup sekarang'

  const cloudStatusLabel = !isFirebaseConfigured
    ? null
    : isLoggedIn && user
      ? user.email ?? 'Terhubung'
      : null

  return (
    <section className="space-y-4">
      {/* ── Hero card ── */}
      <div className="rounded-xl border border-neutral-200 bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Beranda</p>
            <h2 className="mt-1 truncate text-xl font-bold text-neutral-900">{storeName}</h2>
          </div>
          <span
            className={`mt-0.5 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              isOnline ? 'bg-success-50 text-success' : 'bg-warning-50 text-warning'
            }`}
          >
            {isOnline ? '● Online' : '○ Offline'}
          </span>
        </div>

        <Link
          to="/kasir"
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-800 active:scale-[0.98] sm:w-auto"
        >
          Mulai Transaksi →
        </Link>
      </div>

      {/* ── Kartu ringkasan ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Omzet — klik ke Ringkasan Laporan Hari Ini */}
        <Link
          to="/laporan/ringkasan"
          className="rounded-xl border border-neutral-200 bg-surface p-4 transition-colors hover:bg-neutral-50 active:scale-[0.98] active:bg-neutral-100"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Omzet Hari Ini
          </p>
          <p className="mt-2 font-mono text-lg font-bold text-neutral-900">
            {formatCurrency(todaySummary.omzet)}
          </p>
          <p className="mt-1 text-xs font-semibold text-primary">Lihat ringkasan →</p>
        </Link>

        {/* Transaksi — klik ke Laporan Transaksi Hari Ini */}
        <Link
          to="/laporan/transaksi?view=today"
          className="rounded-xl border border-neutral-200 bg-surface p-4 transition-colors hover:bg-neutral-50 active:scale-[0.98] active:bg-neutral-100"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Transaksi
          </p>
          <p className="mt-2 font-mono text-lg font-bold text-neutral-900">
            {todaySummary.transactionCount}
            <span className="ml-1 text-xs font-normal text-neutral-400">hari ini</span>
          </p>
          <p className="mt-1 text-xs font-semibold text-primary">Lihat transaksi →</p>
        </Link>
      </div>

      {/* ── Peringatan stok menipis (tampil jika ada) ── */}
      {lowStockCount > 0 && (
        <Link
          to="/laporan/stok-menipis"
          className="flex items-center gap-4 rounded-xl border border-warning-200 bg-warning-50 p-4 transition-colors hover:bg-warning-100 active:scale-[0.99]"
        >
          {/* Ikon peringatan */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-100 text-lg">
            ⚠️
          </div>

          {/* Teks peringatan */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning-600">
              Peringatan Stok
            </p>
            <p className="mt-0.5 text-sm font-bold text-warning-700">
              {lowStockCount} produk stok menipis
            </p>
            <p className="mt-0.5 text-xs text-warning-600">Ketuk untuk lihat & perbarui stok</p>
          </div>

          {/* Chevron */}
          <span className="shrink-0 text-xl font-light text-warning-400">›</span>
        </Link>
      )}

      {/* ── Kartu status backup (full-width, tappable) ── */}
      <Link
        to="/lainnya/backup"
        className={`flex items-center gap-4 rounded-xl border p-4 transition-colors active:scale-[0.99] ${
          hasLocalChanges
            ? 'border-warning-200 bg-warning-50 hover:bg-warning-100'
            : 'border-neutral-200 bg-surface hover:bg-neutral-50'
        }`}
      >
        {/* Ikon status */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
            hasLocalChanges ? 'bg-warning-100' : 'bg-neutral-100'
          }`}
        >
          {hasLocalChanges ? '⚠️' : lastBackupAt || lastCloudBackupAt ? '✅' : '💾'}
        </div>

        {/* Teks status */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Status Backup
          </p>
          <p
            className={`mt-0.5 text-sm font-bold ${
              hasLocalChanges ? 'text-warning-700' : 'text-neutral-900'
            }`}
          >
            {backupStatusLabel}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500">{backupDetailLabel}</p>
          {cloudStatusLabel && (
            <p className="mt-0.5 truncate text-xs font-semibold text-success-700">
              ☁ {cloudStatusLabel}
            </p>
          )}
        </div>

        {/* Chevron navigasi */}
        <span className="shrink-0 text-xl font-light text-neutral-300">›</span>
      </Link>
    </section>
  )
}
