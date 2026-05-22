import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Beranda', to: '/beranda' },
  { label: 'Kasir', to: '/kasir' },
  { label: 'Produk', to: '/produk' },
  { label: 'Laporan', to: '/laporan' },
  { label: 'Lainnya', to: '/lainnya' },
] as const

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-surface">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex min-w-0 items-center justify-center rounded-md px-1 text-xs font-semibold transition-colors',
                isActive ? 'text-primary' : 'text-neutral-500 hover:text-neutral-900',
              ].join(' ')
            }
          >
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
