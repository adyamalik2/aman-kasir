import { useRef, useState } from 'react'
import { ReceiptPreview } from './ReceiptPreview'
import {
  copyReceiptText,
  createReceiptJpgFile,
  createReceiptPdfFile,
  downloadFile,
  openWhatsAppReceipt,
  printReceipt,
  shareReceiptFile,
  type ReceiptSnapshot,
} from './receiptUtils'
import { getReceiptSettings } from '@/lib/receiptSettings'

interface ReceiptActionSheetProps {
  snapshot: ReceiptSnapshot
  onClose: () => void
  closeLabel?: string
}

type BusyAction = 'jpg' | 'pdf' | 'share-jpg' | 'share-pdf' | null

export function ReceiptActionSheet({
  snapshot,
  onClose,
  closeLabel = 'Tutup',
}: ReceiptActionSheetProps) {
  const receiptRef = useRef<HTMLDivElement | null>(null)
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Baca settings saat ActionSheet dibuka (satu kali, tidak perlu reaktif)
  const settings = getReceiptSettings()

  const getReceiptElement = (): HTMLElement => {
    if (!receiptRef.current) {
      throw new Error('Preview struk tidak ditemukan.')
    }
    return receiptRef.current
  }

  const runFileAction = async (
    action: Exclude<BusyAction, null>,
    handler: () => Promise<void>,
  ) => {
    setBusyAction(action)
    setError(null)
    setMessage(null)
    try {
      await handler()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aksi struk gagal.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleDownloadJpg = () =>
    void runFileAction('jpg', async () => {
      const file = await createReceiptJpgFile(getReceiptElement(), snapshot)
      downloadFile(file)
    })

  const handleDownloadPdf = () =>
    void runFileAction('pdf', async () => {
      const file = await createReceiptPdfFile(getReceiptElement(), snapshot)
      downloadFile(file)
    })

  const handleShareJpg = () =>
    void runFileAction('share-jpg', async () => {
      const file = await createReceiptJpgFile(getReceiptElement(), snapshot)
      const shared = await shareReceiptFile(file, snapshot)
      if (!shared) {
        downloadFile(file)
        setMessage('Share file tidak didukung. JPG sudah didownload.')
      }
    })

  const handleSharePdf = () =>
    void runFileAction('share-pdf', async () => {
      const file = await createReceiptPdfFile(getReceiptElement(), snapshot)
      const shared = await shareReceiptFile(file, snapshot)
      if (!shared) {
        downloadFile(file)
        setMessage('Share file tidak didukung. PDF sudah didownload.')
      }
    })

  const handlePrint = () => {
    setError(null)
    try {
      printReceipt(snapshot)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuka print.')
    }
  }

  const handleCopy = async () => {
    setError(null)
    setMessage(null)
    try {
      await copyReceiptText(snapshot)
      setMessage('Teks struk disalin.')
    } catch {
      setError('Gagal menyalin teks struk.')
    }
  }

  const isBusy = busyAction !== null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div
        data-receipt-sheet="true"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-neutral-50 sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-success-700">Struk transaksi</p>
              <h3 className="mt-1 text-lg font-bold text-neutral-900">
                {snapshot.transaction.invoiceNo}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              data-android-back-close="true"
              className="rounded-md border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
            >
              {closeLabel}
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-md bg-success-50 px-3 py-2 text-sm text-success-700">
              {message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => receiptRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Lihat Struk
            </button>
            <button
              type="button"
              onClick={() => openWhatsAppReceipt(snapshot)}
              className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Copy Teks
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Print
            </button>
            <button
              type="button"
              onClick={handleDownloadJpg}
              disabled={isBusy}
              className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
            >
              {busyAction === 'jpg' ? 'Membuat...' : 'JPG'}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isBusy}
              className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
            >
              {busyAction === 'pdf' ? 'Membuat...' : 'PDF'}
            </button>
            <button
              type="button"
              onClick={handleShareJpg}
              disabled={isBusy}
              className="rounded-md border border-primary-200 bg-white px-3 py-3 text-sm font-bold text-primary hover:bg-primary-50 disabled:opacity-60"
            >
              {busyAction === 'share-jpg' ? 'Share...' : 'Share JPG'}
            </button>
            <button
              type="button"
              onClick={handleSharePdf}
              disabled={isBusy}
              className="rounded-md bg-primary px-3 py-3 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
            >
              {busyAction === 'share-pdf' ? 'Share...' : 'Share PDF'}
            </button>
          </div>

          <div className="bg-white py-4">
            <div ref={receiptRef} className="mx-auto inline-block w-full max-w-[320px] bg-white">
              <ReceiptPreview
                transaction={snapshot.transaction}
                items={snapshot.items}
                storeProfile={snapshot.storeProfile}
                cashierName={snapshot.cashierName}
                settings={settings}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
