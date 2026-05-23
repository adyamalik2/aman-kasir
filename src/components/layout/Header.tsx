import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth/AuthService'
import { isFirebaseConfigured } from '@/infra/cloud/firebase'

export default function Header() {
  const storeName = useAppStore((state) => state.storeName)
  const isOnline = useAppStore((state) => state.isOnline)
  const { user, isLoggedIn, isLoading } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Tutup dropdown saat klik di luar
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
      setLoginError(err instanceof Error ? err.message : 'Login gagal.')
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

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-surface px-4 py-3">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-neutral-500">Toko</p>
          <h1 className="truncate text-lg font-bold text-neutral-900">{storeName}</h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Status online */}
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isOnline ? 'bg-success-50 text-success' : 'bg-warning-50 text-warning'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {/* Auth area — tampil hanya bila Firebase dikonfigurasi */}
          {isFirebaseConfigured && !isLoading && (
            <div className="relative" ref={dropdownRef}>
              {isLoggedIn && user ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white hover:bg-primary-800"
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
                    <div className="absolute right-0 top-10 z-20 w-56 rounded-lg border border-neutral-200 bg-surface shadow-lg">
                      <div className="border-b border-neutral-100 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {user.displayName ?? '—'}
                        </p>
                        <p className="truncate text-xs text-neutral-500">{user.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className="w-full px-4 py-3 text-left text-sm text-danger-700 hover:bg-neutral-50"
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
                  className="rounded-md border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Masuk
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {loginError && (
        <div className="mx-auto mt-2 max-w-2xl rounded-md bg-danger-50 px-3 py-1.5 text-xs text-danger-700">
          {loginError}
        </div>
      )}
    </header>
  )
}
