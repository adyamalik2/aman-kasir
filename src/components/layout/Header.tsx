import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth/AuthService'
import { isFirebaseConfigured } from '@/infra/cloud/firebase'
import { formatDate } from '@/lib/date'
import { Icon } from '@/components/ui'

export default function Header() {
  const storeName = useAppStore((state) => state.storeName)
  const isOnline = useAppStore((state) => state.isOnline)
  const { user, isLoggedIn, isLoading } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const handleLogin = async () => {
    setLoginError(null)
    try {
      await authService.signInWithGoogle()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login gagal.'
      // Jangan tampilkan error jika user sengaja batalkan login
      if (/cancel/i.test(msg)) return
      setLoginError('Login Google gagal. Pastikan koneksi internet aktif, lalu coba lagi.')
      setTimeout(() => setLoginError(null), 4000)
    }
  }

  const handleLogout = async () => {
    setDropdownOpen(false)
    await authService.signOut()
  }

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '?'

  const today = formatDate(new Date().toISOString())

  return (
    <header
      data-app-header="true"
      className="glass sticky top-0 z-10 border-b border-neutral-200/70 px-4 py-3 dark:border-dark-border"
    >
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
        {/* Kiri: Logo + nama toko + tanggal */}
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <Icon name="store" size={20} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-base font-bold leading-tight text-neutral-900 dark:text-white">
                {storeName}
              </h1>
              <span
                title={isOnline ? 'Online' : 'Offline'}
                className={`h-2 w-2 shrink-0 rounded-full ${
                  isOnline ? 'bg-success-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' : 'bg-warning-500'
                }`}
              />
            </div>
            <p className="text-xs leading-tight text-neutral-500 dark:text-dark-muted">{today}</p>
          </div>
        </div>

        {/* Kanan: Auth */}
        <div className="flex shrink-0 items-center gap-2">
          {isFirebaseConfigured && !isLoading && (
            <div className="relative" ref={dropdownRef}>
              {isLoggedIn && user ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white shadow-glow transition-transform active:scale-95"
                    title={user.displayName ?? user.email ?? 'Akun'}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName ?? 'avatar'}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-11 z-20 w-56 animate-scale-in overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card dark:border-dark-border dark:bg-dark-elevated">
                      <div className="border-b border-neutral-100 px-4 py-3 dark:border-dark-border">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                          {user.displayName ?? '—'}
                        </p>
                        <p className="truncate text-xs text-neutral-500 dark:text-dark-muted">{user.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-danger-700 transition-colors hover:bg-neutral-50 dark:text-danger-500 dark:hover:bg-dark-border"
                      >
                        <Icon name="log-out" size={16} />
                        Keluar
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleLogin()}
                  className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-dark-border dark:bg-dark-card dark:text-dark-muted dark:hover:bg-dark-elevated"
                >
                  <Icon name="user" size={14} />
                  Masuk
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {loginError && (
        <div className="mx-auto mt-2 max-w-2xl rounded-xl bg-danger-50 px-3 py-1.5 text-xs text-danger-700 dark:bg-danger-700/20 dark:text-danger-500">
          {loginError}
        </div>
      )}
    </header>
  )
}
