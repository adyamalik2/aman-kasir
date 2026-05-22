import { Link } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'

const summaryItems = [
  { label: 'Omzet Hari Ini', value: 'Rp0', numeric: true },
  { label: 'Transaksi Hari Ini', value: '0', numeric: true },
  { label: 'Status Backup', value: 'Belum ada backup', numeric: false },
] as const

export default function DashboardScreen() {
  const isOnline = useAppStore((state) => state.isOnline)

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-neutral-200 bg-surface p-5 shadow-sm">
        <p className="text-sm font-semibold text-primary">Beranda</p>
        <h2 className="mt-2 text-2xl font-bold text-neutral-900">
          Selamat Datang di AMAN Kasir
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Kasir yang Jalan Terus, Walau Sinyal Pergi.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isOnline ? 'bg-success-50 text-success' : 'bg-warning-50 text-warning'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <span className="text-xs text-neutral-500">
            Transaksi tetap disiapkan untuk mode offline-first.
          </span>
        </div>

        <Link
          to="/kasir"
          className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-800 sm:w-auto"
        >
          Mulai Transaksi
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {summaryItems.map((item) => (
          <div key={item.label} className="rounded-lg border border-neutral-200 bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-neutral-500">{item.label}</p>
            <p
              className={`mt-2 text-lg font-bold text-neutral-900 ${
                item.numeric ? 'font-numeric' : ''
              }`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
