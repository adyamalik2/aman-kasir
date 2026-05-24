import { useEffect, useRef, useState } from 'react'

interface DetectedBarcode {
  rawValue: string
  format: string
}

// Type deklarasi untuk BarcodeDetector Web API
// (belum ada di TypeScript lib standar, tapi sudah support di Chrome 83+ / Android WebView modern)
interface BarcodeDetectorApi {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>
}

declare class BarcodeDetectorCtor {
  constructor(options?: { formats?: string[] })
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>
}

function getBarcodeDetector(): BarcodeDetectorApi | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BarcodeDetector = (window as any).BarcodeDetector as typeof BarcodeDetectorCtor | undefined
  if (!BarcodeDetector) return null
  return new BarcodeDetector({
    formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'itf', 'upc_a', 'upc_e'],
  })
}

interface BarcodeScannerModalProps {
  onScan: (value: string) => void
  onClose: () => void
}

export default function BarcodeScannerModal({ onScan, onClose }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let rafId = 0
    let stopped = false

    const start = async () => {
      // Cek apakah BarcodeDetector API tersedia
      const detector = getBarcodeDetector()
      if (!detector) {
        setStatus('error')
        setErrorMsg(
          'Perangkat tidak mendukung scan kamera otomatis. Ketik atau tempel barcode secara manual di kolom pencarian.',
        )
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })

        if (stopped) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        await video.play()
        setStatus('scanning')

        const scan = async () => {
          if (stopped || !video) return
          try {
            const barcodes = await detector.detect(video)
            if (barcodes.length > 0 && barcodes[0]) {
              const value = barcodes[0].rawValue
              if (value) {
                stopped = true
                onScan(value)
                onClose()
                return
              }
            }
          } catch {
            // Abaikan error deteksi per-frame
          }
          rafId = requestAnimationFrame(() => void scan())
        }

        rafId = requestAnimationFrame(() => void scan())
      } catch (err) {
        if (stopped) return
        setStatus('error')
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setErrorMsg(
            'Izin kamera ditolak. Buka Pengaturan → Aplikasi → AMAN Kasir → Izin → aktifkan Kamera, lalu coba lagi.',
          )
        } else {
          setErrorMsg('Tidak dapat mengakses kamera. Pastikan kamera tidak dipakai aplikasi lain.')
        }
      }
    }

    void start()

    return () => {
      stopped = true
      cancelAnimationFrame(rafId)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onScan, onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Area kamera */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Overlay dengan area target scan */}
        {status === 'scanning' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {/* Kotak target barcode */}
            <div className="relative h-28 w-72 rounded-lg border-2 border-white/90 shadow-lg">
              {/* Sudut-sudut highlight */}
              <span className="absolute -left-0.5 -top-0.5 h-5 w-5 rounded-tl-lg border-l-4 border-t-4 border-primary" />
              <span className="absolute -right-0.5 -top-0.5 h-5 w-5 rounded-tr-lg border-r-4 border-t-4 border-primary" />
              <span className="absolute -bottom-0.5 -left-0.5 h-5 w-5 rounded-bl-lg border-b-4 border-l-4 border-primary" />
              <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-br-lg border-b-4 border-r-4 border-primary" />
              {/* Garis scan animasi */}
              <div className="scan-line absolute left-0 right-0 h-0.5 bg-primary/80" />
            </div>
            <p className="mt-4 rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-white">
              Arahkan kamera ke barcode produk
            </p>
          </div>
        )}

        {/* Status starting */}
        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-sm font-semibold text-white">Memulai kamera...</p>
          </div>
        )}
      </div>

      {/* Error panel */}
      {status === 'error' && errorMsg && (
        <div className="bg-danger-50 px-4 py-3">
          <p className="text-sm font-semibold text-danger-700">⚠️ Scan kamera tidak tersedia</p>
          <p className="mt-1 text-xs text-danger-600">{errorMsg}</p>
        </div>
      )}

      {/* Tombol tutup */}
      <button
        type="button"
        onClick={onClose}
        className="w-full bg-white py-4 text-center text-sm font-bold text-neutral-700 active:bg-neutral-100"
      >
        Tutup
      </button>

      <style>{`
        @keyframes scanLine {
          0% { top: 8px; }
          50% { top: calc(100% - 10px); }
          100% { top: 8px; }
        }
        .scan-line {
          animation: scanLine 2s linear infinite;
        }
      `}</style>
    </div>
  )
}
