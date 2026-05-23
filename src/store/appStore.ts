import { create } from 'zustand'
import { getStoreName } from '@/lib/storeProfile'

interface AppState {
  storeName: string
  isOnline: boolean
  lastBackupAt: string | null
  setOnlineStatus: (isOnline: boolean) => void
  setStoreName: (storeName: string) => void
  setLastBackupAt: (value: string | null) => void
}

function getInitialOnlineStatus(): boolean {
  if (typeof navigator === 'undefined') {
    return true
  }

  return navigator.onLine
}

export const useAppStore = create<AppState>((set) => ({
  storeName: getStoreName(),
  isOnline: getInitialOnlineStatus(),
  lastBackupAt: null,
  setOnlineStatus: (isOnline) => set({ isOnline }),
  setStoreName: (storeName) => set({ storeName }),
  setLastBackupAt: (lastBackupAt) => set({ lastBackupAt }),
}))
