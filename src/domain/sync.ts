export const SYNC_STATUSES = [
  'local_only',
  'pending_sync',
  'synced',
  'sync_failed',
  'conflict',
] as const

export type SyncStatus = (typeof SYNC_STATUSES)[number]

export interface BaseSyncFields {
  id: string
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
  syncVersion: number
}
