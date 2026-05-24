/** Pengaturan printer dan struk — disimpan di localStorage key "receipt_settings" */

export interface PrinterSettings {
  /** Tampilkan nama toko di header struk (default: true) */
  tampilkanNamaToko: boolean
  /** Tampilkan nomor transaksi / invoice di struk (default: true) */
  tampilkanNomorTransaksi: boolean
  /** Auto buka dialog print/simpan setelah transaksi selesai (default: false) */
  autoPrint: boolean
  /** Teks tambahan di bawah nama toko — untuk slogan/sapaan singkat (default: '') */
  headerTeks: string
  /** Teks footer bawah struk (default: 'Terima kasih telah berbelanja') */
  footerTeks: string
  /** Baris kosong tambahan di akhir struk (0–5) (default: 0) */
  marginBawah: number
  /** Jenis koneksi printer (default: 'browser') */
  jenisKoneksi: 'browser' | 'bluetooth' | 'usb'
}

export const RECEIPT_SETTINGS_KEY = 'receipt_settings'

export const DEFAULT_RECEIPT_SETTINGS: PrinterSettings = {
  tampilkanNamaToko: true,
  tampilkanNomorTransaksi: true,
  autoPrint: false,
  headerTeks: '',
  footerTeks: 'Terima kasih telah berbelanja',
  marginBawah: 0,
  jenisKoneksi: 'browser',
}

export function getReceiptSettings(): PrinterSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_RECEIPT_SETTINGS }
  try {
    const raw = localStorage.getItem(RECEIPT_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_RECEIPT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<PrinterSettings>
    return {
      tampilkanNamaToko: parsed.tampilkanNamaToko ?? DEFAULT_RECEIPT_SETTINGS.tampilkanNamaToko,
      tampilkanNomorTransaksi: parsed.tampilkanNomorTransaksi ?? DEFAULT_RECEIPT_SETTINGS.tampilkanNomorTransaksi,
      autoPrint: parsed.autoPrint ?? DEFAULT_RECEIPT_SETTINGS.autoPrint,
      headerTeks: parsed.headerTeks ?? DEFAULT_RECEIPT_SETTINGS.headerTeks,
      footerTeks: parsed.footerTeks?.trim() || DEFAULT_RECEIPT_SETTINGS.footerTeks,
      marginBawah: Math.min(5, Math.max(0, parsed.marginBawah ?? DEFAULT_RECEIPT_SETTINGS.marginBawah)),
      jenisKoneksi: parsed.jenisKoneksi ?? DEFAULT_RECEIPT_SETTINGS.jenisKoneksi,
    }
  } catch {
    return { ...DEFAULT_RECEIPT_SETTINGS }
  }
}

export function setReceiptSettings(settings: PrinterSettings): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(RECEIPT_SETTINGS_KEY, JSON.stringify(settings))
}
