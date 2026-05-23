import { useEffect, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { seedDemoData } from '@/infra/db/seed'
import { getLastBackupAt } from '@/lib/storage'

interface ProvidersProps {
  children: ReactNode
}

function OnlineStatusProvider({ children }: ProvidersProps) {
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
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
  const setLastBackupAt = useAppStore((state) => state.setLastBackupAt)

  useEffect(() => {
    const stored = getLastBackupAt()
    if (stored) {
      setLastBackupAt(stored)
    }
  }, [setLastBackupAt])

  return children
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <BrowserRouter>
      <DbInitProvider>
        <BackupHydrationProvider>
          <OnlineStatusProvider>{children}</OnlineStatusProvider>
        </BackupHydrationProvider>
      </DbInitProvider>
    </BrowserRouter>
  )
}
