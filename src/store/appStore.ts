import { create } from 'zustand'
import { getStoreName } from '@/lib/storeProfile'
import {
  getBackupStatusMetadata,
  markBackupClean as persistBackupClean,
  markLocalDataChanged,
  type BackupStatusMetadata,
} from '@/lib/storage'

interface AppState {
  storeName: string
  isOnline: boolean
  lastBackupAt: string | null
  lastCloudBackupAt: string | null
  hasLocalChanges: boolean
  lastChangeAt: string | null
  lastChangeReason: string | null
  setOnlineStatus: (isOnline: boolean) => void
  setStoreName: (storeName: string) => void
  setLastBackupAt: (value: string | null) => void
  setBackupStatus: (metadata: BackupStatusMetadata) => void
  markLocalChange: (reason: string) => void
  markBackupClean: (options?: { lastBackupAt?: string; lastCloudBackupAt?: string }) => void
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
  setOnlineStatus: (isOnline) => set({ isOnline }),
  setStoreName: (storeName) => set({ storeName }),
  setLastBackupAt: (lastBackupAt) => set({ lastBackupAt }),
  setBackupStatus: (metadata) => set(metadata),
  markLocalChange: (reason) => set(markLocalDataChanged(reason)),
  markBackupClean: (options) => set(persistBackupClean(options)),
}))
