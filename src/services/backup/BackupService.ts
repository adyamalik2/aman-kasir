import { db } from '@/infra/db/dexie'
import { useAppStore } from '@/store/appStore'
import { BACKUP_VERSION, type BackupFile } from './types'
import { downloadBlob } from '@/services/export/download'

export class BackupService {
  async exportFullDatabase(): Promise<BackupFile> {
    const [products, categories, transactions, transactionItems, stockMovements] =
      await Promise.all([
        db.products.toArray(),
        db.categories.toArray(),
        db.transactions.toArray(),
        db.transactionItems.toArray(),
        db.stockMovements.toArray(),
      ])

    const storeName = useAppStore.getState().storeName

    return {
      version: BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      products,
      categories,
      transactions,
      transaction_items: transactionItems,
      stock_movements: stockMovements,
      settings: { storeName },
    }
  }

  downloadAsFile(json: BackupFile, filename?: string): void {
    const dateStr = new Date().toISOString().slice(0, 10)
    const name = filename ?? `aman-kasir-backup-${dateStr}.json`
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: 'application/json',
    })
    downloadBlob(blob, name)
  }

  async backupNow(): Promise<{ timestamp: string }> {
    const data = await this.exportFullDatabase()
    this.downloadAsFile(data)
    useAppStore.getState().markBackupClean({ lastBackupAt: data.timestamp })
    return { timestamp: data.timestamp }
  }
}
