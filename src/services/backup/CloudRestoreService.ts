/**
 * CloudRestoreService — unduh backup dari Firestore lalu restore ke IndexedDB.
 */
import { CloudBackupService, type CloudBackupMeta } from './CloudBackupService'
import { RestoreService } from './RestoreService'
import type { RestoreMode, RestoreResult } from './types'
import { useAppStore } from '@/store/appStore'

const cloudBackupService = new CloudBackupService()
const restoreService = new RestoreService()

const emptyRestored = () => ({
  products: 0,
  categories: 0,
  transactions: 0,
  transaction_items: 0,
  stock_movements: 0,
})

export class CloudRestoreService {
  /**
   * 1. Download + decompress backup dari Firestore
   * 2. Validasi format BackupFile
   * 3. Restore ke IndexedDB
   *
   * @param uid   UID user yang sedang login
   * @param meta  Metadata backup yang akan di-restore
   * @param mode  'replace' (hapus semua lalu insert) | 'merge' (tambah yang belum ada)
   */
  async restoreFromCloud(
    uid: string,
    meta: CloudBackupMeta,
    mode: RestoreMode,
  ): Promise<RestoreResult> {
    // 1. Download dan decompress
    let backupFile
    try {
      backupFile = await cloudBackupService.downloadBackup(uid, meta.id)
    } catch (err) {
      return {
        success: false,
        restored: emptyRestored(),
        error: err instanceof Error ? err.message : 'Gagal mengunduh backup cloud.',
      }
    }

    // 2. Validasi
    const validation = restoreService.validateBackupFile(backupFile)
    if (!validation.valid || !validation.data) {
      return {
        success: false,
        restored: emptyRestored(),
        error: validation.error ?? 'File backup cloud tidak valid.',
      }
    }

    // 3. Restore ke IndexedDB
    const result = await restoreService.restoreFromBackup(validation.data, mode)
    if (result.success) {
      useAppStore.getState().markBackupClean()
    }
    return result
  }
}
