import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { PaymentMethod, Transaction } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import type { StoreProfile } from '@/lib/storeProfile'
import { isAndroidNative } from '@/native/platform'
import { shareBlobNative } from '@/native/shareFile'
import { downloadBlob } from '@/services/export/download'
import type { ReceiptPreviewItem } from './ReceiptPreview'

export interface ReceiptSnapshot {
  transaction: Transaction
  items: ReceiptPreviewItem[]
  storeProfile: StoreProfile
  cashierName: string
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
  piutang: 'Piutang',
  mixed: 'Campuran',
}

export function makeReceiptFilename(invoiceNo: string, extension: string): string {
  const safeInvoice = invoiceNo.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `struk-${safeInvoice}.${extension}`
}

export function buildReceiptText(snapshot: ReceiptSnapshot): string {
  const { transaction, items, storeProfile, cashierName } = snapshot
  const date = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(transaction.date))

  const lines = [
    storeProfile.namaToko,
    storeProfile.alamat,
    storeProfile.nomorTelepon,
    '',
    `No: ${transaction.invoiceNo}`,
    `Tanggal: ${date}`,
    `Kasir: ${cashierName}`,
    '',
    ...items.flatMap((item) => [
      item.productName,
      `${item.qty} x ${formatCurrency(item.price)} = ${formatCurrency(item.subtotal)}`,
    ]),
    '',
    `Subtotal: ${formatCurrency(transaction.subtotal)}`,
    transaction.discount > 0 ? `Diskon: ${formatCurrency(transaction.discount)}` : '',
    transaction.tax > 0 ? `Pajak: ${formatCurrency(transaction.tax)}` : '',
    `Total: ${formatCurrency(transaction.total)}`,
    `Metode: ${PAYMENT_LABELS[transaction.paymentMethod]}`,
    `Bayar: ${formatCurrency(transaction.paidAmount)}`,
    transaction.changeAmount > 0 ? `Kembali: ${formatCurrency(transaction.changeAmount)}` : '',
    '',
    'Terima kasih telah berbelanja',
    'AMAN Kasir - Kasir yang Jalan Terus, Walau Sinyal Pergi',
  ]

  return lines.filter((line) => line !== '').join('\n')
}

function formatWhatsAppDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const dateText = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
  const timeText = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)

  return `${dateText}, ${timeText}`
}

export function buildWhatsAppReceiptText(snapshot: ReceiptSnapshot): string {
  const { transaction, items, storeProfile, cashierName } = snapshot
  const lines: string[] = [`🧾 *${storeProfile.namaToko}*`]
  const address = storeProfile.alamat.trim()
  const phone = storeProfile.nomorTelepon.trim()

  if (address) lines.push(address)
  if (phone) lines.push(`Telp: ${phone}`)

  lines.push(
    '',
    `*No. Invoice:* ${transaction.invoiceNo}`,
    `*Tanggal:* ${formatWhatsAppDate(transaction.date)}`,
    `*Kasir:* ${cashierName || 'Kasir'}`,
    '',
    '*Detail Belanja*',
    '',
  )

  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.productName}`,
      `   Qty: ${item.qty} x ${formatCurrency(item.price)}`,
      `   Subtotal: ${formatCurrency(item.subtotal)}`,
      '',
    )
  })

  lines.push('---', `Subtotal: ${formatCurrency(transaction.subtotal)}`)

  if (transaction.discount > 0) {
    lines.push(`Diskon: ${formatCurrency(transaction.discount)}`)
  }
  if (transaction.tax > 0) {
    lines.push(`Pajak: ${formatCurrency(transaction.tax)}`)
  }

  lines.push(
    `*TOTAL: ${formatCurrency(transaction.total)}*`,
    '',
    `Metode Bayar: ${PAYMENT_LABELS[transaction.paymentMethod]}`,
  )

  if (transaction.paidAmount > 0) {
    lines.push(`Bayar: ${formatCurrency(transaction.paidAmount)}`)
  }
  if (transaction.changeAmount > 0) {
    lines.push(`Kembalian: ${formatCurrency(transaction.changeAmount)}`)
  }

  lines.push(
    '',
    'Terima kasih telah berbelanja 🙏',
    '',
    'AMAN Kasir',
    'Kasir yang Jalan Terus,',
    'Walau Sinyal Pergi',
  )

  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return entities[char] ?? char
  })
}

export async function getReceiptCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  })
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Gagal membuat file struk.'))
          return
        }
        resolve(result)
      },
      type,
      quality,
    )
  })
}

export async function createReceiptJpgFile(
  element: HTMLElement,
  snapshot: ReceiptSnapshot,
): Promise<File> {
  const canvas = await getReceiptCanvas(element)
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
  return new File([blob], makeReceiptFilename(snapshot.transaction.invoiceNo, 'jpg'), {
    type: 'image/jpeg',
  })
}

export async function createReceiptPdfFile(
  element: HTMLElement,
  snapshot: ReceiptSnapshot,
): Promise<File> {
  const canvas = await getReceiptCanvas(element)
  const image = canvas.toDataURL('image/jpeg', 0.92)
  const pdfWidth = 80
  const pdfHeight = Math.max(120, (canvas.height * pdfWidth) / canvas.width)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
  })

  pdf.addImage(image, 'JPEG', 0, 0, pdfWidth, pdfHeight)
  const blob = pdf.output('blob')

  return new File([blob], makeReceiptFilename(snapshot.transaction.invoiceNo, 'pdf'), {
    type: 'application/pdf',
  })
}

export function downloadFile(file: File): void {
  downloadBlob(file, file.name)
}

export async function shareReceiptFile(file: File, snapshot: ReceiptSnapshot): Promise<boolean> {
  if (isAndroidNative()) {
    await shareBlobNative(
      file,
      file.name,
      file.type,
      snapshot.transaction.invoiceNo,
      buildWhatsAppReceiptText(snapshot),
    )
    return true
  }

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }
  const shareData: ShareData = {
    files: [file],
    title: snapshot.transaction.invoiceNo,
    text: buildWhatsAppReceiptText(snapshot),
  }

  if (!navigator.share || !nav.canShare?.(shareData)) {
    return false
  }

  await navigator.share(shareData)
  return true
}

export function openWhatsAppReceipt(snapshot: ReceiptSnapshot): void {
  const text = encodeURIComponent(buildWhatsAppReceiptText(snapshot))
  window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
}

export async function copyReceiptText(snapshot: ReceiptSnapshot): Promise<void> {
  await navigator.clipboard.writeText(buildWhatsAppReceiptText(snapshot))
}

export function printReceipt(snapshot: ReceiptSnapshot): void {
  if (isAndroidNative()) {
    throw new Error(
      'Print langsung belum didukung di APK. Gunakan Share PDF/JPG lalu pilih aplikasi print atau WhatsApp.',
    )
  }

  const popup = window.open('', '_blank', 'width=380,height=640')
  if (!popup) {
    throw new Error('Popup print diblokir browser.')
  }

  popup.document.write(`
    <html>
      <head>
        <title>${escapeHtml(snapshot.transaction.invoiceNo)}</title>
        <style>
          body { margin: 0; padding: 16px; font-family: "Roboto Mono", monospace; }
          pre { width: 80mm; max-width: 100%; white-space: pre-wrap; font-size: 12px; line-height: 1.55; }
          @media print { body { padding: 0; } pre { width: 80mm; } }
        </style>
      </head>
      <body>
        <pre>${escapeHtml(buildReceiptText(snapshot))}</pre>
      </body>
    </html>
  `)
  popup.document.close()
  popup.focus()
  popup.print()
}
