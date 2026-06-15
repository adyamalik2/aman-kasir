import { ListTile, PageHeader, type IconName } from '@/components/ui'

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

interface MenuItem {
  icon: IconName
  tone: Tone
  label: string
  description: string
  to: string | null
  badge?: string
}

const menuItems: MenuItem[] = [
  {
    icon: 'settings',
    tone: 'primary',
    label: 'Pengaturan',
    description: 'Profil toko, tema, kategori, dan preferensi aplikasi.',
    to: '/lainnya/pengaturan',
  },
  {
    icon: 'printer',
    tone: 'accent',
    label: 'Printer dan Struk',
    description: 'Kustomisasi tampilan struk, header, footer, dan auto print.',
    to: '/lainnya/printer-struk',
  },
  {
    icon: 'users',
    tone: 'success',
    label: 'Pelanggan',
    description: 'Kelola daftar pelanggan toko — nama, telepon, catatan.',
    to: '/lainnya/pelanggan',
  },
  {
    icon: 'database',
    tone: 'warning',
    label: 'Backup & Restore',
    description: 'Backup lokal dan cloud, restore data.',
    to: '/lainnya/backup',
  },
  {
    icon: 'info',
    tone: 'neutral',
    label: 'Tentang',
    description: 'Versi aplikasi, fitur, pengembang, dan teknologi.',
    to: '/lainnya/tentang',
  },
]

export default function MoreScreen() {
  return (
    <section className="space-y-4">
      <PageHeader eyebrow="Menu" title="Lainnya" icon="grid" />

      <div className="space-y-2.5">
        {menuItems.map((item) => (
          <ListTile
            key={item.label}
            to={item.to ?? undefined}
            icon={item.icon}
            tone={item.tone}
            title={item.label}
            description={item.description}
            badge={item.badge}
            disabled={!item.to}
          />
        ))}
      </div>
    </section>
  )
}
