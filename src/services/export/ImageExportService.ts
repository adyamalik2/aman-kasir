import html2canvas from 'html2canvas'
import { downloadBlob } from './download'

export class ImageExportService {
  async exportElementToImage(
    elementId: string,
    filename = 'laporan-ringkasan.png',
  ): Promise<void> {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Elemen laporan tidak ditemukan.')
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
    })

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Gagal membuat gambar laporan.'))
          return
        }
        downloadBlob(blob, filename)
        resolve()
      }, 'image/png')
    })
  }
}
