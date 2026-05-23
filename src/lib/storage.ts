export const STORAGE_KEYS = {
  lastBackupAt: 'aman-kasir-last-backup-at',
  lastCloudBackupAt: 'aman-kasir-last-cloud-backup-at',
  hasLocalChanges: 'aman-kasir-has-local-changes',
  lastChangeAt: 'aman-kasir-last-change-at',
  lastChangeReason: 'aman-kasir-last-change-reason',
} as const

export interface BackupStatusMetadata {
  hasLocalChanges: boolean
  lastBackupAt: string | null
  lastCloudBackupAt: string | null
  lastChangeAt: string | null
  lastChangeReason: string | null
}

export function getLastBackupAt(): string | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  return localStorage.getItem(STORAGE_KEYS.lastBackupAt)
}

export function setLastBackupAt(iso: string): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEYS.lastBackupAt, iso)
}

export function getLastCloudBackupAt(): string | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  return localStorage.getItem(STORAGE_KEYS.lastCloudBackupAt)
}

export function setLastCloudBackupAt(iso: string): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEYS.lastCloudBackupAt, iso)
}

export function getBackupStatusMetadata(): BackupStatusMetadata {
  if (typeof localStorage === 'undefined') {
    return {
      hasLocalChanges: false,
      lastBackupAt: null,
      lastCloudBackupAt: null,
      lastChangeAt: null,
      lastChangeReason: null,
    }
  }

  return {
    hasLocalChanges: localStorage.getItem(STORAGE_KEYS.hasLocalChanges) === 'true',
    lastBackupAt: getLastBackupAt(),
    lastCloudBackupAt: getLastCloudBackupAt(),
    lastChangeAt: localStorage.getItem(STORAGE_KEYS.lastChangeAt),
    lastChangeReason: localStorage.getItem(STORAGE_KEYS.lastChangeReason),
  }
}

export function markLocalDataChanged(reason: string): BackupStatusMetadata {
  if (typeof localStorage === 'undefined') {
    return getBackupStatusMetadata()
  }

  localStorage.setItem(STORAGE_KEYS.hasLocalChanges, 'true')
  localStorage.setItem(STORAGE_KEYS.lastChangeAt, new Date().toISOString())
  localStorage.setItem(STORAGE_KEYS.lastChangeReason, reason)

  return getBackupStatusMetadata()
}

export function markBackupClean(options: {
  lastBackupAt?: string
  lastCloudBackupAt?: string
} = {}): BackupStatusMetadata {
  if (typeof localStorage === 'undefined') {
    return getBackupStatusMetadata()
  }

  if (options.lastBackupAt) {
    setLastBackupAt(options.lastBackupAt)
  }
  if (options.lastCloudBackupAt) {
    setLastCloudBackupAt(options.lastCloudBackupAt)
  }

  localStorage.setItem(STORAGE_KEYS.hasLocalChanges, 'false')
  localStorage.removeItem(STORAGE_KEYS.lastChangeReason)

  return getBackupStatusMetadata()
}
