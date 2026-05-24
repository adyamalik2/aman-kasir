import { Link } from 'react-router-dom'

interface MenuItem {
  to: string
  icon: string
  title: string
  description: string
}

const MENU_ITEMS: MenuItem[] = [
  {
    to: '/laporan/ringkasan',
    icon: '📊',
    title: 'Ringkasan Laporan Penjualan',
    description: 'Statistik transaksi, pendapatan & keuntungan dengan grafik',
  },
  {
    to: '/laporan/transaksi',
    icon: '📋',
    title: 'Laporan Transaksi',
    description: 'Riwayat transaksi per hari, bulan, tahun — sampai struk',
  },
  {
    to: '/laporan/terlaris',
    icon: '⭐',
    title: 'Produk Terlaris',
    description: 'Produk dengan penjualan qty & omzet tertinggi',
  },
  {
    to: '/laporan/stok-menipis',
    icon: '📦',
    title: 'Stok Menipis',
    description: 'Produk dengan stok di bawah batas minimum',
  },
  {
    to: '/laporan/piutang',
    icon: '💳',
    title: 'Piutang',
    description: 'Transaksi piutang yang belum & sudah dilunasi',
  },
]

export default function ReportsScreen() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">Menu</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">Laporan</h2>
      </div>

      <ul className="space-y-2">
        {MENU_ITEMS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="flex items-center gap-4 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-4 transition-colors hover:bg-neutral-50 dark:hover:bg-dark-elevated active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30 text-xl">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-900 dark:text-white">{item.title}</p>
                <p className="mt-0.5 text-xs text-neutral-400 dark:text-dark-muted">{item.description}</p>
              </div>
              <span className="shrink-0 text-xl font-light text-neutral-300 dark:text-dark-border">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
