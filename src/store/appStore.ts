import { create } from 'zustand'
import { getStoreName } from '@/lib/storeProfile'
import {
  getBackupStatusMetadata,
  markBackupClean as persistBackupClean,
  markLocalDataChanged,
  type BackupStatusMetadata,
} from '@/lib/storage'

export type AppTheme = 'light' | 'dark' | 'system'

const THEME_KEY = 'aman_kasir_theme'

function getInitialTheme(): AppTheme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch { /* localStorage tidak tersedia */ }
  return 'system'
}

interface AppState {
  storeName: string
  isOnline: boolean
  lastBackupAt: string | null
  lastCloudBackupAt: string | null
  hasLocalChanges: boolean
  lastChangeAt: string | null
  lastChangeReason: string | null
  theme: AppTheme
  setOnlineStatus: (isOnline: boolean) => void
  setStoreName: (storeName: string) => void
  setLastBackupAt: (value: string | null) => void
  setBackupStatus: (metadata: BackupStatusMetadata) => void
  markLocalChange: (reason: string) => void
  markBackupClean: (options?: { lastBackupAt?: string; lastCloudBackupAt?: string }) => void
  setTheme: (theme: AppTheme) => void
}

function getInitialOnlineStatus(): boolean {
  if (typeof navigator === 'undefined') {
    return true
  }

  return navigator.onLine
}

const initialBackupStatus = getBackupStatusMetadata()

export const useAppStore = create<AppState>((set) => ({
  storeName: getStoreName(),
  isOnline: getInitialOnlineStatus(),
  lastBackupAt: initialBackupStatus.lastBackupAt,
  lastCloudBackupAt: initialBackupStatus.lastCloudBackupAt,
  hasLocalChanges: initialBackupStatus.hasLocalChanges,
  lastChangeAt: initialBackupStatus.lastChangeAt,
  lastChangeReason: initialBackupStatus.lastChangeReason,
  theme: getInitialTheme(),
  setOnlineStatus: (isOnline) => set({ isOnline }),
  setStoreName: (storeName) => set({ storeName }),
  setLastBackupAt: (lastBackupAt) => set({ lastBackupAt }),
  setBackupStatus: (metadata) => set(metadata),
  markLocalChange: (reason) => set(markLocalDataChanged(reason)),
  markBackupClean: (options) => set(persistBackupClean(options)),
  setTheme: (theme) => {
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* no-op */ }
    set({ theme })
  },
}))
