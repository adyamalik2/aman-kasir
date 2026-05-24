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

function OnlineStatusProvider({ children }: ProvidersProps) {
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    if (isNativeApp()) {
      // Capacitor Android/iOS: gunakan @capacitor/network
      // (navigator.onLine tidak reliable di Android WebView)
      let listenerHandle: { remove: () => Promise<void> } | null = null

      void (async () => {
        // Baca status awal
        const status = await Network.getStatus()
        setOnlineStatus(status.connected)

        // Listen perubahan
        listenerHandle = await Network.addListener('networkStatusChange', (s) => {
          setOnlineStatus(s.connected)
        })
      })()

      return () => {
        void listenerHandle?.remove()
      }
    }

    // Web path: gunakan event browser standard
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
    // Subscribe ke perubahan status Firebase Auth.
    // Bila Firebase tidak dikonfigurasi, authService.onAuthStateChanged
    // langsung memanggil callback(null) dan mengembalikan no-op.
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
      <DbInitProvider>
        <BackupHydrationProvider>
          <OnlineStatusProvider>
            <AuthProvider>{children}</AuthProvider>
          </OnlineStatusProvider>
        </BackupHydrationProvider>
      </DbInitProvider>
    </BrowserRouter>
  )
}
