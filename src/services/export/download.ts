import { isNativeApp } from '@/native/platform'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/**
 * Konversi Blob ke base64 string (tanpa prefix data URI).
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca file.'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      // Hapus prefix "data:...;base64," jika ada
      resolve(result.includes(',') ? (result.split(',')[1] ?? '') : result)
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * Simpan blob ke cache native dan buka share sheet Android/iOS.
 * Digunakan untuk semua export file di APK.
 */
export async function shareFileNative(blob: Blob, filename: string): Promise<void> {
  const base64 = await blobToBase64(blob)
  const written = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  })
  await Share.share({
    title: filename,
    files: [written.uri],
    dialogTitle: 'Simpan atau Bagikan File',
  })
}

/**
 * Download file:
 * - Web: trigger download via <a> element
 * - Native Android/iOS: buka share sheet lewat Capacitor Share
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (isNativeApp()) {
    shareFileNative(blob, filename).catch((err: unknown) => {
      console.error('[AMAN Kasir] Native share gagal:', err)
    })
    return
  }

  // Web path — blob URL + anchor click
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
