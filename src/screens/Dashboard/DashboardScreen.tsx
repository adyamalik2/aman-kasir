import { useState, useEffect } from 'react'
import { db } from '@/infra/db/dexie'
import { Link } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { useTransactionStore } from '@/store/transactionStore'
import { isFirebaseConfigured } from '@/infra/cloud/firebase'
import { formatCurrency } from '@/lib/currency'
import { getLowStock } from '@/screens/Reports/reportApi'
import { Icon, StatCard, type IconName } from '@/components/ui'

export default function DashboardScreen() {
  const lastBackupAt = useAppStore((state) => state.lastBackupAt)
  const lastCloudBackupAt = useAppStore((state) => state.lastCloudBackupAt)
  const hasLocalChanges = useAppStore((state) => state.hasLocalChanges)
  const lastChangeReason = useAppStore((state) => state.lastChangeReason)
  const storeName = useAppStore((state) => state.storeName)
  const { todaySummary, loadTodaySummary } = useTransactionStore()
  const { user, isLoggedIn } = useAuthStore()
  const [lowStockCount, setLowStockCount] = useState(0)
  const [outOfStockCount, setOutOfStockCount] = useState(0)
  const [summaryLoaded, setSummaryLoaded] = useState(false)

  useEffect(() => {
    void loadTodaySummary().finally(() => setSummaryLoaded(true))
  }, [loadTodaySummary])

  useEffect(() => {
    const refresh = () => {
      getLowStock
        .execute()
        .then((products) => setLowStockCount(products.length))
        .catch(() => {
          /* non-critical */
        })
      db.products
        .toArray()
        .then((products) => setOutOfStockCount(products.filter((p) => p.isActive && p.stock === 0).length))
        .catch(() => {
          /* non-critical */
        })
    }
    refresh()
    const handleVisibility = () => {
      if (!document.hidden) refresh()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const isBackedUp = Boolean(lastBackupAt || lastCloudBackupAt)
  const backupStatusLabel = hasLocalChanges
    ? 'Belum dibackup'
    : isBackedUp
      ? 'Data aman'
      : 'Belum ada backup'

  const backupDetailLabel = hasLocalChanges
    ? (lastChangeReason ?? 'Ada perubahan lokal')
    : lastBackupAt
      ? `Lokal: ${lastBackupAt.slice(0, 10)}`
      : lastCloudBackupAt
        ? `Cloud tersinkron`
        : 'Ketuk untuk backup sekarang'

  const cloudStatusLabel = !isFirebaseConfigured ? null : isLoggedIn && user ? (user.email ?? 'Terhubung') : null

  const backupIcon: IconName = hasLocalChanges ? 'alert-triangle' : isBackedUp ? 'shield-check' : 'database'

  return (
    <section className="space-y-3">
      {/* ── Hero Card — Omzet Hari Ini ── */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-mesh p-5 shadow-lifted">
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/85">
              <Icon name="trending-up" size={14} /> Omzet Hari Ini
            </p>
            {summaryLoaded ? (
              <p className="mt-1.5 font-mono text-[2rem] font-bold leading-none text-white [text-shadow:0_1px_3px_rgba(15,23,42,0.22)]">
                {formatCurrency(todaySummary.omzet)}
              </p>
            ) : (
              <div className="skeleton mt-1.5 h-9 w-44 rounded-lg bg-white/20" />
            )}
            {summaryLoaded ? (
              <p className="mt-2 text-xs text-white/85">
                {todaySummary.transactionCount} transaksi · {storeName}
              </p>
            ) : (
              <div className="skeleton mt-2 h-4 w-32 rounded bg-white/20" />
            )}
          </div>
          <Link
            to="/laporan/ringkasan"
            className="flex shrink-0 items-center gap-1 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            Lihat <Icon name="arrow-right" size={14} />
          </Link>
        </div>

        {/* Tombol Mulai Transaksi */}
        <Link
          to="/kasir"
          className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-primary-700 shadow-sm transition-all hover:bg-white/95 active:scale-[0.98]"
        >
          <Icon name="cart" size={18} /> Mulai Transaksi
        </Link>
      </div>

      {/* ── Kartu Ringkasan 2-kolom ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon="receipt"
          label="Transaksi"
          value={todaySummary.transactionCount}
          hint="Hari ini →"
          tone="primary"
          to="/laporan/transaksi?view=today"
          loading={!summaryLoaded}
        />

        {/* Status Backup — tone dinamis */}
        <Link
          to="/lainnya/backup"
          className={`block rounded-2xl border p-4 shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card active:scale-[0.98] ${
            hasLocalChanges
              ? 'border-warning-200 bg-warning-50 dark:border-warning-700/50 dark:bg-warning-700/10'
              : 'border-neutral-200/80 bg-white dark:border-dark-border dark:bg-dark-card'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                hasLocalChanges
                  ? 'bg-warning-100 text-warning-600 dark:bg-warning-700/20 dark:text-warning-300'
                  : isBackedUp
                    ? 'bg-success-50 text-success-600 dark:bg-success-700/20 dark:text-success-300'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-dark-elevated dark:text-dark-muted'
              }`}
            >
              <Icon name={backupIcon} size={16} />
            </span>
            <p className="text-xs font-semibold text-neutral-500 dark:text-dark-muted">Backup</p>
          </div>
          <p
            className={`mt-2 text-sm font-bold ${
              hasLocalChanges ? 'text-warning-700 dark:text-warning-400' : 'text-neutral-900 dark:text-white'
            }`}
          >
            {backupStatusLabel}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-dark-muted">{backupDetailLabel}</p>
          {cloudStatusLabel && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-semibold text-success-600 dark:text-success-400">
              <Icon name="cloud" size={13} /> {cloudStatusLabel}
            </p>
          )}
        </Link>
      </div>

      {/* ── Peringatan stok habis ── */}
      {outOfStockCount > 0 && (
        <Link
          to="/produk"
          className="flex items-center gap-3 rounded-2xl border border-danger-100 bg-danger-50 p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card active:scale-[0.99] dark:border-danger-700/50 dark:bg-danger-700/10"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600 dark:bg-danger-700/20 dark:text-danger-300">
            <Icon name="alert-circle" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-danger-600 dark:text-danger-400">
              Stok Habis
            </p>
            <p className="text-sm font-bold text-danger-700 dark:text-danger-300">
              {outOfStockCount} produk kehabisan stok
            </p>
          </div>
          <Icon name="chevron-right" size={20} className="shrink-0 text-danger-400" />
        </Link>
      )}

      {/* ── Peringatan stok menipis ── */}
      {lowStockCount > 0 && (
        <Link
          to="/laporan/stok-menipis"
          className="flex items-center gap-3 rounded-2xl border border-warning-200 bg-warning-50 p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card active:scale-[0.99] dark:border-warning-700/50 dark:bg-warning-700/10"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-100 text-warning-600 dark:bg-warning-700/20 dark:text-warning-300">
            <Icon name="alert-triangle" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning-600 dark:text-warning-400">
              Peringatan Stok
            </p>
            <p className="text-sm font-bold text-warning-700 dark:text-warning-300">
              {lowStockCount} produk stok menipis
            </p>
          </div>
          <Icon name="chevron-right" size={20} className="shrink-0 text-warning-500" />
        </Link>
      )}

      {/* ── Quick links ── */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { to: '/produk', icon: 'package', label: 'Produk' },
            { to: '/laporan', icon: 'chart', label: 'Laporan' },
            { to: '/lainnya/pelanggan', icon: 'users', label: 'Pelanggan' },
          ] as { to: string; icon: IconName; label: string }[]
        ).map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white py-4 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card active:scale-[0.97] dark:border-dark-border dark:bg-dark-card"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
              <Icon name={item.icon} size={20} />
            </span>
            <span className="text-xs font-semibold text-neutral-700 dark:text-dark-muted">{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
