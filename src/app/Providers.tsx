import { useEffect, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Network } from '@capacitor/network'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth/AuthService'
import { seedDemoData } from '@/infra/db/seed'
import { getBackupStatusMetadata } from '@/lib/storage'
import { isNativeApp } from '@/native/platform'

interface ProvidersProps {
  children: ReactNode
}

/** Menerapkan class 'dark' ke <html> sesuai preferensi tema yang disimpan. */
function ThemeProvider({ children }: ProvidersProps) {
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    const apply = (dark: boolean) => {
      document.documentElement.classList.toggle('dark', dark)
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mq.matches)
      const handler = (e: MediaQueryListEvent) => apply(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }

    apply(theme === 'dark')
  }, [theme])

  return children
}

function OnlineStatusProvider({ children }: ProvidersProps) {
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    if (isNativeApp()) {
      let listenerHandle: { remove: () => Promise<void> } | null = null

      void (async () => {
        const status = await Network.getStatus()
        setOnlineStatus(status.connected)

        listenerHandle = await Network.addListener('networkStatusChange', (s) => {
          setOnlineStatus(s.connected)
        })
      })()

      return () => {
        void listenerHandle?.remove()
      }
    }

    const updateOnlineStatus = () => {
      setOnlineStatus(window.navigator.onLine)
    }

    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [setOnlineStatus])

  return children
}

function DbInitProvider({ children }: ProvidersProps) {
  useEffect(() => {
    seedDemoData().catch((err) => {
      console.error('[AMAN Kasir] Gagal inisialisasi data awal:', err)
    })
  }, [])

  return children
}

function BackupHydrationProvider({ children }: ProvidersProps) {
  const setBackupStatus = useAppStore((state) => state.setBackupStatus)

  useEffect(() => {
    setBackupStatus(getBackupStatusMetadata())
  }, [setBackupStatus])

  return children
}

function AuthProvider({ children }: ProvidersProps) {
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user)
    })
    return unsubscribe
  }, [setUser])

  return children
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <DbInitProvider>
          <BackupHydrationProvider>
            <OnlineStatusProvider>
              <AuthProvider>{children}</AuthProvider>
            </OnlineStatusProvider>
          </BackupHydrationProvider>
        </DbInitProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
