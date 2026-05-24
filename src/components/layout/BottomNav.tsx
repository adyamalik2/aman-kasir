import { NavLink, Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.78 0l-8-4a2 2 0 0 1-1.11-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z" />
      <polyline points="2.32 6.16 12 11 21.68 6.16" />
      <line x1="12" y1="22.76" x2="12" y2="11" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

// ── NavItem ────────────────────────────────────────────────────────────────────

function NavItem({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <NavLink to={to} className="flex-1">
      {({ isActive }) => (
        <div className={`flex flex-col items-center gap-0.5 py-1 transition-colors ${
          isActive ? 'text-primary dark:text-primary-400' : 'text-neutral-400 dark:text-dark-muted'
        }`}>
          <span className="h-5 w-5">{children}</span>
          <span className="text-[10px] font-semibold leading-none">{label}</span>
          <span className={`mt-0.5 h-1 w-1 rounded-full transition-opacity ${
            isActive ? 'bg-primary dark:bg-primary-400 opacity-100' : 'opacity-0'
          }`} />
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
    <nav
      data-bottom-nav="true"
      className="fixed inset-x-0 bottom-0 z-20 px-3 pb-2"
    >
      <div className="mx-auto max-w-2xl">
        {/* Floating pill */}
        <div className="relative flex h-16 items-center justify-around rounded-2xl border
          border-neutral-100 bg-white px-2
          shadow-xl shadow-black/5
          dark:border-dark-border dark:bg-dark-card dark:shadow-black/50">

          {/* Beranda */}
          <NavItem to="/beranda" label="Beranda"><HomeIcon /></NavItem>

          {/* Laporan */}
          <NavItem to="/laporan" label="Laporan"><ChartIcon /></NavItem>

          {/* Spacer untuk FAB */}
          <div className="w-14 shrink-0" />

          {/* Produk */}
          <NavItem to="/produk" label="Produk"><PackageIcon /></NavItem>

          {/* Lainnya */}
          <NavItem to="/lainnya" label="Lainnya"><GridIcon /></NavItem>

          {/* ── Center FAB — Kasir ── */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-5 flex flex-col items-center">
            <Link to="/kasir" className="block">
              <div className={`
                h-14 w-14 rounded-full flex items-center justify-center
                shadow-lg ring-4 transition-all duration-200
                ${isKasirActive
                  ? 'bg-primary-800 ring-primary-100/80 dark:ring-dark-bg shadow-primary-900/40'
                  : 'bg-primary ring-white dark:ring-dark-bg shadow-primary/30 dark:shadow-primary/20'
                }
              `}>
                <span className="text-white"><CartIcon /></span>
              </div>
            </Link>
            <span className={`mt-0.5 text-[10px] font-semibold leading-none transition-colors ${
              isKasirActive
                ? 'text-primary dark:text-primary-400'
                : 'text-neutral-400 dark:text-dark-muted'
            }`}>
              Kasir
            </span>
          </div>

        </div>
      </div>
    </nav>
  )
}
