/**
 * CloudBackupService — simpan/ambil/hapus backup di Firestore (tanpa Firebase Storage).
 *
 * Data backup di-compress dengan LZ-String sebelum disimpan sebagai field string
 * di dokumen Firestore, sehingga tidak memerlukan Blaze plan.
 *
 * Firestore path: /users/{uid}/backups/{backupId}
 *
 * Schema dokumen:
 *   id            string
 *   createdAt     Timestamp
 *   deviceName    string
 *   version       number (1)
 *   summary       { productCount, transactionCount, categoryCount }
 *   fileSizeBytes number (ukuran JSON asli sebelum compress, dalam byte)
 *   data          string (JSON backup di-compress dengan LZString.compressToUTF16)
 */
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import LZString from 'lz-string'
import { firestore } from '@/infra/cloud/firebase'
import { useAppStore } from '@/store/appStore'
import { BackupService } from './BackupService'
import type { BackupFile } from './types'

const backupService = new BackupService()

export interface CloudBackupMeta {
  id: string
  createdAt: string  // ISO string (dikonversi dari Firestore Timestamp)
  deviceName: string
  version: number
  summary: {
    productCount: number
    transactionCount: number
    categoryCount: number
  }
  fileSizeBytes: number
}

interface FirestoreBackupDoc {
  createdAt: Timestamp
  deviceName: string
  version: number
  summary: CloudBackupMeta['summary']
  fileSizeBytes: number
  data: string
}

function firestoreColPath(uid: string) {
  return `users/${uid}/backups`
}

function buildSummary(data: BackupFile): CloudBackupMeta['summary'] {
  return {
    productCount: data.products.length,
    transactionCount: data.transactions.length,
    categoryCount: data.categories.length,
  }
}

export interface UploadResult {
  success: boolean
  backupId: string
  uploadedAt: string
}

export class CloudBackupService {
  /**
   * 1. Ambil full backup dari IndexedDB (BackupService)
   * 2. Compress JSON dengan LZString.compressToUTF16
   * 3. Simpan ke Firestore sebagai field `data`
   * 4. Catat waktu di localStorage
   * 5. Return hasil
   */
  async uploadBackup(uid: string): Promise<UploadResult> {
    if (!firestore) {
      throw new Error('Firebase belum dikonfigurasi.')
    }

    // 1. Export database
    const data = await backupService.exportFullDatabase()
    const jsonStr = JSON.stringify(data)
    const fileSizeBytes = new Blob([jsonStr]).size

    // 2. Compress
    const compressed = LZString.compressToUTF16(jsonStr)

    const deviceName =
      typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : 'Unknown'

    const docPayload: Omit<FirestoreBackupDoc, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      createdAt: serverTimestamp(),
      deviceName,
      version: data.version,
      summary: buildSummary(data),
      fileSizeBytes,
      data: compressed,
    }

    // 3. Simpan ke Firestore
    const colRef = collection(firestore, firestoreColPath(uid))
    const docRef = await addDoc(colRef, docPayload)

    const uploadedAt = new Date().toISOString()

    // 4. Catat waktu dan bersihkan indikator perubahan lokal
    useAppStore.getState().markBackupClean({ lastCloudBackupAt: uploadedAt })

    return { success: true, backupId: docRef.id, uploadedAt }
  }

  /**
   * Ambil 10 backup cloud terbaru untuk user (metadata saja, tanpa field `data`).
   */
  async listCloudBackups(uid: string): Promise<CloudBackupMeta[]> {
    if (!firestore) throw new Error('Firebase belum dikonfigurasi.')

    const colRef = collection(firestore, firestoreColPath(uid))
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(10))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((d) => {
      const raw = d.data() as FirestoreBackupDoc
      return {
        id: d.id,
        createdAt: raw.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        deviceName: raw.deviceName ?? '',
        version: raw.version ?? 1,
        summary: raw.summary ?? { productCount: 0, transactionCount: 0, categoryCount: 0 },
        fileSizeBytes: raw.fileSizeBytes ?? 0,
      }
    })
  }

  /**
   * 1. Ambil dokumen Firestore berdasarkan backupId
   * 2. Decompress field `data` dengan LZString.decompressFromUTF16
   * 3. Return parsed BackupFile
   */
  async downloadBackup(uid: string, backupId: string): Promise<BackupFile> {
    if (!firestore) throw new Error('Firebase belum dikonfigurasi.')

    const docRef = doc(firestore, firestoreColPath(uid), backupId)
    const snap = await getDoc(docRef)

    if (!snap.exists()) {
      throw new Error(`Backup tidak ditemukan: ${backupId}`)
    }

    const raw = snap.data() as FirestoreBackupDoc
    const decompressed = LZString.decompressFromUTF16(raw.data)

    if (!decompressed) {
      throw new Error('Gagal decompress data backup. File mungkin rusak.')
    }

    const parsed: unknown = JSON.parse(decompressed)
    return parsed as BackupFile
  }

  /**
   * Hapus dokumen Firestore (tidak ada file Storage yang perlu dihapus).
   */
  async deleteCloudBackup(uid: string, backupId: string): Promise<void> {
    if (!firestore) throw new Error('Firebase belum dikonfigurasi.')

    const docRef = doc(firestore, firestoreColPath(uid), backupId)
    await deleteDoc(docRef)
  }
}
