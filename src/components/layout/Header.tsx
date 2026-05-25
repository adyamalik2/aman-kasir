import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth/AuthService'
import { isFirebaseConfigured } from '@/infra/cloud/firebase'
import { formatDate } from '@/lib/date'

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
      className="sticky top-0 z-10 border-b border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-3"
    >
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">

        {/* Kiri: Nama toko + tanggal */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-bold text-neutral-900 dark:text-white leading-tight">
              {storeName}
            </h1>
            {/* Status dot */}
            <span
              title={isOnline ? 'Online' : 'Offline'}
              className={`h-2 w-2 shrink-0 rounded-full ${
                isOnline ? 'bg-success' : 'bg-warning'
              }`}
            />
          </div>
          <p className="text-xs text-neutral-500 dark:text-dark-muted leading-tight">{today}</p>
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
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary dark:bg-primary-800 text-xs font-bold text-white hover:bg-primary-800 dark:hover:bg-primary-700 transition-colors"
                    title={user.displayName ?? user.email ?? 'Akun'}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName ?? 'avatar'}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-10 z-20 w-56 rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated shadow-lg dark:shadow-black/40">
                      <div className="border-b border-neutral-100 dark:border-dark-border px-4 py-3">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                          {user.displayName ?? '—'}
                        </p>
                        <p className="truncate text-xs text-neutral-500 dark:text-dark-muted">{user.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className="w-full px-4 py-3 text-left text-sm text-danger-700 dark:text-danger-500 hover:bg-neutral-50 dark:hover:bg-dark-border transition-colors"
                      >
                        Keluar
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleLogin()}
                  className="rounded-lg border border-neutral-200 dark:border-dark-border px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-elevated transition-colors"
                >
                  Masuk
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {loginError && (
        <div className="mx-auto mt-2 max-w-2xl rounded-md bg-danger-50 dark:bg-danger-700/20 px-3 py-1.5 text-xs text-danger-700 dark:text-danger-400">
          {loginError}
        </div>
      )}
    </header>
  )
}
