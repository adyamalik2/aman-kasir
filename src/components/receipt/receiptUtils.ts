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
  customerName?: string   // diisi saat metode = piutang dan ada pelanggan terpilih
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
    snapshot.customerName ? `Pelanggan: ${snapshot.customerName}` : '',
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
    snapshot.customerName ? `*Pelanggan:* ${snapshot.customerName}` : '',
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

/**
 * Buat HTML struk untuk print — digunakan oleh printReceipt().
 * Menggunakan inline styles agar bisa dirender di iframe / popup tanpa CSS eksternal.
 */
function buildPrintHtml(snapshot: ReceiptSnapshot): string {
  const { transaction, items, storeProfile, cashierName } = snapshot

  const date = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(transaction.date))

  // Baca settings printer (lebar kertas, dll.)
  let paperWidth = '80mm'
  let footerText = 'Terima kasih telah berbelanja'
  let showNamaToko = true
  let showNomorTransaksi = true
  let headerTeks = ''
  let marginBawah = 0

  try {
    const raw = localStorage.getItem('receipt_settings')
    if (raw) {
      const cfg = JSON.parse(raw) as Record<string, unknown>
      if (cfg.lebarKertas === '58mm') paperWidth = '58mm'
      if (typeof cfg.footerTeks === 'string' && cfg.footerTeks.trim()) footerText = cfg.footerTeks
      if (cfg.tampilkanNamaToko === false) showNamaToko = false
      if (cfg.tampilkanNomorTransaksi === false) showNomorTransaksi = false
      if (typeof cfg.headerTeks === 'string') headerTeks = cfg.headerTeks
      if (typeof cfg.marginBawah === 'number') marginBawah = Math.min(5, Math.max(0, cfg.marginBawah))
    }
  } catch { /* pakai default */ }

  const marginLines = '\n'.repeat(marginBawah)

  const itemsHtml = items.map((item) => `
    <div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between">
        <strong>${escapeHtml(item.productName)}</strong>
        <span>${escapeHtml(formatCurrency(item.subtotal))}</span>
      </div>
      <div style="font-size:11px;color:#555">
        <span>${item.qty} x ${escapeHtml(formatCurrency(item.price))}</span>
        ${item.sku ? `<span style="float:right">${escapeHtml(item.sku)}</span>` : ''}
      </div>
    </div>
  `).join('')

  const discountRow = transaction.discount > 0
    ? `<div style="display:flex;justify-content:space-between"><span>Diskon</span><span>${escapeHtml(formatCurrency(transaction.discount))}</span></div>` : ''
  const taxRow = transaction.tax > 0
    ? `<div style="display:flex;justify-content:space-between"><span>Pajak</span><span>${escapeHtml(formatCurrency(transaction.tax))}</span></div>` : ''
  const changeRow = transaction.changeAmount > 0
    ? `<div style="display:flex;justify-content:space-between"><span>Kembali</span><span>${escapeHtml(formatCurrency(transaction.changeAmount))}</span></div>` : ''

  const paymentLabels: Record<string, string> = {
    cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', piutang: 'Piutang', mixed: 'Campuran',
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(transaction.invoiceNo)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.5;
      width: ${paperWidth};
      max-width: 100%;
      padding: 8px;
      color: #000;
    }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .center { text-align: center; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .bold { font-weight: bold; }
    .small { font-size: 11px; color: #444; }
    @page {
      size: ${paperWidth} auto;
      margin: 2mm;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="center">
    ${showNamaToko ? `<div class="bold" style="font-size:14px">${escapeHtml(storeProfile.namaToko)}</div>` : ''}
    ${headerTeks ? `<div>${escapeHtml(headerTeks)}</div>` : ''}
    ${storeProfile.alamat ? `<div class="small">${escapeHtml(storeProfile.alamat)}</div>` : ''}
    ${storeProfile.nomorTelepon ? `<div class="small">${escapeHtml(storeProfile.nomorTelepon)}</div>` : ''}
  </div>

  <div class="divider"></div>

  ${showNomorTransaksi ? `<div class="row"><span>No</span><strong>${escapeHtml(transaction.invoiceNo)}</strong></div>` : ''}
  <div class="row"><span>Tanggal</span><span>${escapeHtml(date)}</span></div>
  <div class="row"><span>Kasir</span><span>${escapeHtml(cashierName)}</span></div>
  ${snapshot.customerName ? `<div class="row"><span>Pelanggan</span><span class="bold">${escapeHtml(snapshot.customerName)}</span></div>` : ''}

  <div class="divider"></div>

  ${itemsHtml}

  <div class="divider"></div>

  <div class="row"><span>Subtotal</span><span>${escapeHtml(formatCurrency(transaction.subtotal))}</span></div>
  ${discountRow}
  ${taxRow}
  <div class="row bold" style="font-size:13px;margin-top:4px">
    <span>Total</span><span>${escapeHtml(formatCurrency(transaction.total))}</span>
  </div>

  <div class="divider"></div>

  <div class="row"><span>Metode</span><span>${escapeHtml(paymentLabels[transaction.paymentMethod] ?? transaction.paymentMethod)}</span></div>
  <div class="row"><span>Bayar</span><span>${escapeHtml(formatCurrency(transaction.paidAmount))}</span></div>
  ${changeRow}

  <div class="divider"></div>

  <div class="center small" style="margin-top:4px">
    <div>${escapeHtml(footerText)}</div>
    <div style="margin-top:4px">AMAN Kasir - Kasir yang Jalan Terus, Walau Sinyal Pergi</div>
    ${marginLines}
  </div>
</body>
</html>`
}

export function printReceipt(snapshot: ReceiptSnapshot): void {
  const html = buildPrintHtml(snapshot)

  // Gunakan iframe tersembunyi — bekerja di browser DAN Android WebView
  // (window.open diblokir WebView secara default, iframe tidak)
  const iframe = document.createElement('iframe')
  Object.assign(iframe.style, {
    position: 'fixed', right: '0', bottom: '0',
    width: '1px', height: '1px', border: '0', opacity: '0',
  })
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    throw new Error('Tidak bisa membuka print. Coba Share PDF sebagai alternatif.')
  }

  doc.open()
  doc.write(html)
  doc.close()

  // Jeda kecil agar konten selesai render, lalu buka dialog print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {
      // fallback: buka di window baru
      const w = window.open('', '_blank', 'width=400,height=600')
      if (w) { w.document.write(html); w.document.close(); w.print() }
    }
    // Bersihkan iframe setelah print dialog ditutup
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe)
    }, 3000)
  }, 400)
}
