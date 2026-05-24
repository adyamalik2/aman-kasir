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
    description: 'Profil toko, tema, kategori, dan preferensi aplikasi.',
    to: '/lainnya/pengaturan',
  },
  {
    icon: '🖨️',
    label: 'Printer dan Struk',
    description: 'Kustomisasi tampilan struk, header, footer, dan auto print.',
    to: '/lainnya/printer-struk',
  },
  {
    icon: '👤',
    label: 'Pelanggan',
    description: 'Kelola daftar pelanggan toko — nama, telepon, catatan.',
    to: '/lainnya/pelanggan',
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
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">Menu</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">Lainnya</h2>
      </div>

      <div className="space-y-2">
        {menuItems.map((item) =>
          item.to ? (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center gap-4 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-dark-elevated active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30 text-xl">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-white">{item.label}</p>
                <p className="mt-0.5 text-xs leading-5 text-neutral-500 dark:text-dark-muted">{item.description}</p>
              </div>
              <span className="shrink-0 text-lg font-light text-neutral-300 dark:text-dark-border">›</span>
            </Link>
          ) : (
            <div
              key={item.label}
              className="flex items-center gap-4 rounded-xl border border-neutral-100 dark:border-dark-border bg-neutral-50 dark:bg-dark-elevated p-4 opacity-60"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-200 dark:bg-dark-border text-xl">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{item.label}</p>
                  {item.badge && (
                    <span className="rounded-full bg-neutral-200 dark:bg-dark-border px-2 py-0.5 text-xs font-semibold text-neutral-500 dark:text-dark-muted">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-5 text-neutral-400 dark:text-dark-muted">{item.description}</p>
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  )
}
