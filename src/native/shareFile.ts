import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca file struk.'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      resolve(result.includes(',') ? result.split(',')[1] ?? '' : result)
    }
    reader.readAsDataURL(blob)
  })
}

export async function shareBlobNative(
  blob: Blob,
  fileName: string,
  _mimeType: string,
  title = 'Struk AMAN Kasir',
  text = 'Struk transaksi AMAN Kasir',
): Promise<void> {
  const base64 = await blobToBase64(blob)
  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  })

  await Share.share({
    title,
    text,
    files: [result.uri],
    dialogTitle: 'Bagikan Struk',
  })
}
