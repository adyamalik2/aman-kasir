import { Link } from 'react-router-dom'

interface MenuItem {
  icon: string
  label: string
  description: string
  to: string | null
  badge?: string
}

const menuItems: MenuItem[] = [
  {
    icon: '⚙️',
    label: 'Pengaturan',
    description: 'Profil toko, kategori, dan preferensi aplikasi.',
    to: '/lainnya/pengaturan',
  },
  {
    icon: '🖨️',
    label: 'Printer dan Struk',
    description: 'Kustomisasi tampilan struk, header, footer, dan auto print.',
    to: '/lainnya/printer-struk',
  },
  {
    icon: '💾',
    label: 'Backup & Restore',
    description: 'Backup lokal dan cloud, restore data.',
    to: '/lainnya/backup',
  },
  {
    icon: 'ℹ️',
    label: 'Tentang',
    description: 'Informasi aplikasi AMAN Kasir.',
    to: null,
    badge: 'Segera',
  },
]

export default function MoreScreen() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium text-neutral-500">Lainnya</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900">Menu Lainnya</h2>
      </div>

      <div className="space-y-2">
        {menuItems.map((item) =>
          item.to ? (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-surface p-4 transition-colors hover:border-primary/30 hover:bg-neutral-50 active:bg-neutral-100"
            >
              {/* Ikon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl">
                {item.icon}
              </div>

              {/* Teks */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-neutral-900">{item.label}</p>
                <p className="mt-0.5 text-xs leading-5 text-neutral-500">{item.description}</p>
              </div>

              {/* Chevron */}
              <span className="shrink-0 text-lg font-light text-neutral-300">›</span>
            </Link>
          ) : (
            <div
              key={item.label}
              className="flex items-center gap-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4 opacity-60"
            >
              {/* Ikon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xl">
                {item.icon}
              </div>

              {/* Teks */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-neutral-700">{item.label}</p>
                  {item.badge && (
                    <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-500">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-5 text-neutral-400">{item.description}</p>
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  )
}
