import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { useTransactionStore } from '@/store/transactionStore'
import { isFirebaseConfigured } from '@/infra/cloud/firebase'
import { formatCurrency } from '@/lib/currency'
import { getLowStock } from '@/screens/Reports/reportApi'

export default function DashboardScreen() {
  const lastBackupAt = useAppStore((state) => state.lastBackupAt)
  const lastCloudBackupAt = useAppStore((state) => state.lastCloudBackupAt)
  const hasLocalChanges = useAppStore((state) => state.hasLocalChanges)
  const lastChangeReason = useAppStore((state) => state.lastChangeReason)
  const storeName = useAppStore((state) => state.storeName)
  const { todaySummary, loadTodaySummary } = useTransactionStore()
  const { user, isLoggedIn } = useAuthStore()
  const [lowStockCount, setLowStockCount] = useState(0)
  const [summaryLoaded, setSummaryLoaded] = useState(false)

  useEffect(() => {
    void loadTodaySummary().finally(() => setSummaryLoaded(true))
  }, [loadTodaySummary])

  useEffect(() => {
    getLowStock
      .execute()
      .then((products) => setLowStockCount(products.length))
      .catch(() => { /* non-critical */ })
  }, [])

  const backupStatusLabel = hasLocalChanges
    ? 'Belum dibackup'
    : lastBackupAt || lastCloudBackupAt
      ? 'Data aman'
      : 'Belum ada backup'

  const backupDetailLabel = hasLocalChanges
    ? (lastChangeReason ?? 'Ada perubahan lokal')
    : lastBackupAt
      ? `Lokal: ${lastBackupAt.slice(0, 10)}`
      : lastCloudBackupAt
        ? `Cloud tersinkron`
        : 'Ketuk untuk backup sekarang'

  const cloudStatusLabel = !isFirebaseConfigured
    ? null
    : isLoggedIn && user
      ? user.email ?? 'Terhubung'
      : null

  return (
    <section className="space-y-3">

      {/* ── Hero Card — Omzet Hari Ini ── */}
      <div className="rounded-2xl bg-primary dark:bg-dark-card border border-primary-900 dark:border-dark-border p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/70 dark:text-dark-muted uppercase tracking-wide">
              Omzet Hari Ini
            </p>
            {summaryLoaded ? (
              <p className="mt-1 font-mono text-3xl font-bold text-white">
                {formatCurrency(todaySummary.omzet)}
              </p>
            ) : (
              <div className="mt-1 h-9 w-40 animate-pulse rounded-lg bg-primary-800 dark:bg-dark-border" />
            )}
            {summaryLoaded ? (
              <p className="mt-1 text-xs text-white/70 dark:text-dark-muted">
                {todaySummary.transactionCount} transaksi · {storeName}
              </p>
            ) : (
              <div className="mt-1 h-4 w-32 animate-pulse rounded bg-primary-800 dark:bg-dark-border" />
            )}
          </div>
          <Link
            to="/laporan/ringkasan"
            className="shrink-0 rounded-lg bg-white/15 dark:bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25 dark:hover:bg-white/15 transition-colors"
          >
            Lihat →
          </Link>
        </div>

        {/* Tombol Mulai Transaksi */}
        <Link
          to="/kasir"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 dark:bg-white/10 py-3 text-sm font-bold text-white hover:bg-white/25 dark:hover:bg-white/15 active:scale-[0.98] transition-all"
        >
          🛒 Mulai Transaksi
        </Link>
      </div>

      {/* ── Kartu Ringkasan 2-kolom ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Transaksi */}
        <Link
          to="/laporan/transaksi?view=today"
          className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-dark-elevated active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30 text-sm">
              🧾
            </div>
            <p className="text-xs font-semibold text-neutral-500 dark:text-dark-muted">Transaksi</p>
          </div>
          {summaryLoaded ? (
            <p className="mt-2 font-mono text-2xl font-bold text-neutral-900 dark:text-white">
              {todaySummary.transactionCount}
            </p>
          ) : (
            <div className="mt-2 h-8 w-12 animate-pulse rounded-md bg-neutral-200 dark:bg-dark-border" />
          )}
          <p className="mt-0.5 text-xs font-semibold text-primary dark:text-primary-400">
            Hari ini →
          </p>
        </Link>

        {/* Status Backup */}
        <Link
          to="/lainnya/backup"
          className={`rounded-xl border p-4 transition-colors active:scale-[0.98] ${
            hasLocalChanges
              ? 'border-warning-200 dark:border-warning-700/50 bg-warning-50 dark:bg-warning-700/10 hover:bg-warning-100 dark:hover:bg-warning-700/20'
              : 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-neutral-50 dark:hover:bg-dark-elevated'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${
              hasLocalChanges
                ? 'bg-warning-100 dark:bg-warning-700/20'
                : lastBackupAt || lastCloudBackupAt
                  ? 'bg-success-50 dark:bg-success-700/20'
                  : 'bg-neutral-100 dark:bg-dark-elevated'
            }`}>
              {hasLocalChanges ? '⚠️' : lastBackupAt || lastCloudBackupAt ? '✅' : '💾'}
            </div>
            <p className="text-xs font-semibold text-neutral-500 dark:text-dark-muted">Backup</p>
          </div>
          <p className={`mt-2 text-sm font-bold ${
            hasLocalChanges ? 'text-warning-700 dark:text-warning-400' : 'text-neutral-900 dark:text-white'
          }`}>
            {backupStatusLabel}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-dark-muted">
            {backupDetailLabel}
          </p>
          {cloudStatusLabel && (
            <p className="mt-0.5 truncate text-xs font-semibold text-success dark:text-success-400">
              ☁ {cloudStatusLabel}
            </p>
          )}
        </Link>
      </div>

      {/* ── Peringatan stok menipis ── */}
      {lowStockCount > 0 && (
        <Link
          to="/laporan/stok-menipis"
          className="flex items-center gap-3 rounded-xl border border-warning-200 dark:border-warning-700/50 bg-warning-50 dark:bg-warning-700/10 p-4 transition-colors hover:bg-warning-100 dark:hover:bg-warning-700/20 active:scale-[0.99]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-100 dark:bg-warning-700/20 text-base">
            ⚠️
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-warning-600 dark:text-warning-400 uppercase tracking-wide">
              Peringatan Stok
            </p>
            <p className="text-sm font-bold text-warning-700 dark:text-warning-300">
              {lowStockCount} produk stok menipis
            </p>
          </div>
          <span className="shrink-0 text-lg text-warning-400">›</span>
        </Link>
      )}

      {/* ── Quick links ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { to: '/produk', icon: '📦', label: 'Produk' },
          { to: '/laporan', icon: '📊', label: 'Laporan' },
          { to: '/lainnya/pelanggan', icon: '👤', label: 'Pelanggan' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card py-3 text-center transition-colors hover:bg-neutral-50 dark:hover:bg-dark-elevated active:scale-[0.97]"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-semibold text-neutral-700 dark:text-dark-muted">{item.label}</span>
          </Link>
        ))}
      </div>

    </section>
  )
}
