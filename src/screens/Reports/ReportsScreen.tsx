import { ListTile, PageHeader, type IconName } from '@/components/ui'

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

interface MenuItem {
  to: string
  icon: IconName
  tone: Tone
  title: string
  description: string
}

const MENU_ITEMS: MenuItem[] = [
  {
    to: '/laporan/ringkasan',
    icon: 'chart',
    tone: 'primary',
    title: 'Ringkasan Laporan Penjualan',
    description: 'Statistik transaksi, pendapatan & keuntungan dengan grafik',
  },
  {
    to: '/laporan/transaksi',
    icon: 'receipt',
    tone: 'accent',
    title: 'Laporan Transaksi',
    description: 'Riwayat transaksi per hari, bulan, tahun — sampai struk',
  },
  {
    to: '/laporan/terlaris',
    icon: 'star',
    tone: 'warning',
    title: 'Produk Terlaris',
    description: 'Produk dengan penjualan qty & omzet tertinggi',
  },
  {
    to: '/laporan/stok-menipis',
    icon: 'package',
    tone: 'danger',
    title: 'Stok Menipis',
    description: 'Produk dengan stok di bawah batas minimum',
  },
  {
    to: '/laporan/piutang',
    icon: 'credit-card',
    tone: 'accent',
    title: 'Piutang',
    description: 'Transaksi piutang yang belum & sudah dilunasi',
  },
  {
    to: '/laporan/laba',
    icon: 'coins',
    tone: 'success',
    title: 'Laba & Margin',
    description: 'Laba kotor dan margin per produk & kategori',
  },
  {
    to: '/laporan/histori-stok',
    icon: 'folder',
    tone: 'neutral',
    title: 'Histori Stok',
    description: 'Pergerakan stok masuk & keluar per produk',
  },
]

export default function ReportsScreen() {
  return (
    <section className="space-y-4">
      <PageHeader eyebrow="Menu" title="Laporan" icon="chart" />

      <div className="space-y-2.5">
        {MENU_ITEMS.map((item) => (
          <ListTile
            key={item.to}
            to={item.to}
            icon={item.icon}
            tone={item.tone}
            title={item.title}
            description={item.description}
          />
        ))}
      </div>
    </section>
  )
}
