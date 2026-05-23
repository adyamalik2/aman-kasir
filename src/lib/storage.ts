export const STORAGE_KEYS = {
  lastBackupAt: 'aman-kasir-last-backup-at',
} as const

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
