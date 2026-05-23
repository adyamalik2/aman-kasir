import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { useTransactionStore } from '@/store/transactionStore'
import { isFirebaseConfigured } from '@/infra/cloud/firebase'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'

export default function DashboardScreen() {
  const isOnline = useAppStore((state) => state.isOnline)
  const lastBackupAt = useAppStore((state) => state.lastBackupAt)
  const { todaySummary, loadTodaySummary } = useTransactionStore()
  const { user, isLoggedIn } = useAuthStore()

  useEffect(() => {
    void loadTodaySummary()
  }, [loadTodaySummary])

  const localBackupLabel = lastBackupAt ? formatDate(lastBackupAt) : 'Belum ada backup'

  // Label status cloud
  const cloudStatusLabel = !isFirebaseConfigured
    ? null
    : isLoggedIn && user
      ? `${user.email ?? 'Terhubung'}`
      : 'Belum login'

  return (
    <section className="space-y-5">
      {/* Hero card */}
      <div className="rounded-lg border border-neutral-200 bg-surface p-5 shadow-sm">
        <p className="text-sm font-semibold text-primary">Beranda</p>
        <h2 className="mt-2 text-2xl font-bold text-neutral-900">Selamat Datang di AMAN Kasir</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Kasir yang Jalan Terus, Walau Sinyal Pergi.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isOnline ? 'bg-success-50 text-success' : 'bg-warning-50 text-warning'
            }`}
          >
            {isOnline ? '● Online' : '○ Offline'}
          </span>
          <span className="text-xs text-neutral-500">
            Transaksi tetap berjalan di mode offline-first.
          </span>
        </div>

        <Link
          to="/kasir"
          className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-800 sm:w-auto"
        >
          Mulai Transaksi
        </Link>
      </div>

      {/* Summary grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Omzet */}
        <div className="rounded-lg border border-neutral-200 bg-surface p-4">
          <p className="text-xs font-semibold uppercase text-neutral-500">Omzet Hari Ini</p>
          <p className="mt-2 font-mono text-lg font-bold text-neutral-900">
            {formatCurrency(todaySummary.omzet)}
          </p>
        </div>

        {/* Transaksi */}
        <div className="rounded-lg border border-neutral-200 bg-surface p-4">
          <p className="text-xs font-semibold uppercase text-neutral-500">Transaksi Hari Ini</p>
          <p className="mt-2 font-mono text-lg font-bold text-neutral-900">
            {todaySummary.transactionCount}
          </p>
        </div>

        {/* Backup status — klik → /lainnya/backup */}
        <Link
          to="/lainnya/backup"
          className="rounded-lg border border-neutral-200 bg-surface p-4 hover:bg-neutral-50 transition-colors"
        >
          <p className="text-xs font-semibold uppercase text-neutral-500">Status Backup</p>
          <p className="mt-2 text-base font-bold text-neutral-900 truncate">{localBackupLabel}</p>
          {cloudStatusLabel && (
            <p
              className={`mt-1 truncate text-xs font-semibold ${
                isLoggedIn ? 'text-success-700' : 'text-neutral-400'
              }`}
            >
              {isLoggedIn ? `☁ ${cloudStatusLabel}` : `☁ ${cloudStatusLabel}`}
            </p>
          )}
        </Link>
      </div>
    </section>
  )
}
