import { useEffect, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { seedDemoData } from '@/infra/db/seed'

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

export default function Providers({ children }: ProvidersProps) {
  return (
    <BrowserRouter>
      <DbInitProvider>
        <OnlineStatusProvider>{children}</OnlineStatusProvider>
      </DbInitProvider>
    </BrowserRouter>
  )
}
