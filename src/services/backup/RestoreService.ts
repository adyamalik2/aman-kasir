import { db } from '@/infra/db/dexie'
import { useAppStore } from '@/store/appStore'
import {
  BACKUP_VERSION,
  type BackupFile,
  type BackupPreview,
  type RestoreMode,
  type RestoreResult,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export class RestoreService {
  validateBackupFile(json: unknown): { valid: boolean; data?: BackupFile; error?: string } {
    if (!isRecord(json)) {
      return { valid: false, error: 'Format file tidak valid.' }
    }

    const version = json.version
    if (version !== BACKUP_VERSION) {
      return {
        valid: false,
        error: `Versi backup tidak didukung (v${String(version)}).`,
      }
    }

    const requiredArrays = [
      'products',
      'categories',
      'transactions',
      'transaction_items',
      'stock_movements',
    ] as const

    for (const key of requiredArrays) {
      if (!Array.isArray(json[key])) {
        return { valid: false, error: `Data ${key} tidak ditemukan.` }
      }
    }

    if (!isRecord(json.settings)) {
      return { valid: false, error: 'Data settings tidak valid.' }
    }

    return { valid: true, data: json as unknown as BackupFile }
  }

  getPreview(data: BackupFile): BackupPreview {
    return {
      version: data.version,
      timestamp: data.timestamp,
      products: data.products.length,
      categories: data.categories.length,
      transactions: data.transactions.length,
      transaction_items: data.transaction_items.length,
      stock_movements: data.stock_movements.length,
    }
  }

  async restoreFromBackup(json: BackupFile, mode: RestoreMode): Promise<RestoreResult> {
    const validation = this.validateBackupFile(json)
    if (!validation.valid || !validation.data) {
      return {
        success: false,
        restored: emptyCounts(),
        error: validation.error ?? 'Validasi gagal.',
      }
    }

    const data = validation.data
    const restored = emptyCounts()

    try {
      await db.transaction(
        'rw',
        [
          db.products,
          db.categories,
          db.transactions,
          db.transactionItems,
          db.stockMovements,
        ],
        async () => {
          if (mode === 'replace') {
            await Promise.all([
              db.products.clear(),
              db.categories.clear(),
              db.transactions.clear(),
              db.transactionItems.clear(),
              db.stockMovements.clear(),
            ])
            await this.bulkInsertAll(data, restored)
          } else {
            await this.mergeAll(data, restored)
          }
        },
      )

      if (data.settings.storeName) {
        useAppStore.getState().setStoreName(data.settings.storeName)
      }

      return { success: true, restored }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal restore backup.'
      return { success: false, restored: emptyCounts(), error: message }
    }
  }

  private async bulkInsertAll(data: BackupFile, restored: RestoreResult['restored']): Promise<void> {
    if (data.products.length > 0) {
      await db.products.bulkAdd(data.products)
      restored.products = data.products.length
    }
    if (data.categories.length > 0) {
      await db.categories.bulkAdd(data.categories)
      restored.categories = data.categories.length
    }
    if (data.transactions.length > 0) {
      await db.transactions.bulkAdd(data.transactions)
      restored.transactions = data.transactions.length
    }
    if (data.transaction_items.length > 0) {
      await db.transactionItems.bulkAdd(data.transaction_items)
      restored.transaction_items = data.transaction_items.length
    }
    if (data.stock_movements.length > 0) {
      await db.stockMovements.bulkAdd(data.stock_movements)
      restored.stock_movements = data.stock_movements.length
    }
  }

  private async mergeAll(data: BackupFile, restored: RestoreResult['restored']): Promise<void> {
    restored.products = await this.mergeTable(db.products, data.products)
    restored.categories = await this.mergeTable(db.categories, data.categories)
    restored.transactions = await this.mergeTable(db.transactions, data.transactions)
    restored.transaction_items = await this.mergeTable(
      db.transactionItems,
      data.transaction_items,
    )
    restored.stock_movements = await this.mergeTable(
      db.stockMovements,
      data.stock_movements,
    )
  }

  private async mergeTable<T extends { id: string }>(
    table: { get: (id: string) => Promise<T | undefined>; add: (item: T) => Promise<string> },
    items: T[],
  ): Promise<number> {
    let count = 0
    for (const item of items) {
      const existing = await table.get(item.id)
      if (!existing) {
        await table.add(item)
        count += 1
      }
    }
    return count
  }
}

function emptyCounts(): RestoreResult['restored'] {
  return {
    products: 0,
    categories: 0,
    transactions: 0,
    transaction_items: 0,
    stock_movements: 0,
  }
}
