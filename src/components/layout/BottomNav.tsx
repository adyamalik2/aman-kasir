import { NavLink, Link, useLocation } from 'react-router-dom'
import { Icon, type IconName } from '@/components/ui'

// ── NavItem ────────────────────────────────────────────────────────────────────

function NavItem({ to, label, icon }: { to: string; label: string; icon: IconName }) {
  return (
    <NavLink to={to} className="flex-1">
      {({ isActive }) => (
        <div
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${
            isActive
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-neutral-400 dark:text-dark-muted'
          }`}
        >
          <Icon name={icon} size={22} strokeWidth={isActive ? 2.4 : 2} />
          <span className="text-[10px] font-semibold leading-none">{label}</span>
          <span
            className={`mt-0.5 h-1 w-1 rounded-full transition-opacity ${
              isActive ? 'bg-primary-600 opacity-100 dark:bg-primary-400' : 'opacity-0'
            }`}
          />
        </div>
      )}
    </NavLink>
  )
}

// ── BottomNav ──────────────────────────────────────────────────────────────────

export default function BottomNav() {
  const location = useLocation()
  const isKasirActive = location.pathname === '/kasir'

  return (
    <nav data-bottom-nav="true" className="fixed inset-x-0 bottom-0 z-20 px-3 pb-2">
      <div className="mx-auto max-w-2xl">
        {/* Floating glass pill */}
        <div
          className="glass relative flex h-16 items-center justify-around rounded-3xl border
          border-white/60 px-2 shadow-card
          dark:border-white/5"
        >
          <NavItem to="/beranda" label="Beranda" icon="home" />
          <NavItem to="/laporan" label="Laporan" icon="chart" />

          {/* Spacer untuk FAB */}
          <div className="w-14 shrink-0" />

          <NavItem to="/produk" label="Produk" icon="package" />
          <NavItem to="/lainnya" label="Lainnya" icon="grid" />

          {/* ── Center FAB — Kasir ── */}
          <div className="absolute left-1/2 -top-6 flex -translate-x-1/2 flex-col items-center">
            <Link to="/kasir" className="block">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl
                ring-4 transition-all duration-200 active:scale-95
                ${
                  isKasirActive
                    ? 'bg-brand-gradient shadow-lifted ring-primary-100/70 dark:ring-dark-bg'
                    : 'bg-brand-gradient shadow-glow ring-white dark:ring-dark-bg'
                }`}
              >
                <span className="text-white">
                  <Icon name="bag" size={26} strokeWidth={2.4} />
                </span>
              </div>
            </Link>
            <span
              className={`mt-1 text-[10px] font-semibold leading-none transition-colors ${
                isKasirActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-neutral-400 dark:text-dark-muted'
              }`}
            >
              Kasir
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}
