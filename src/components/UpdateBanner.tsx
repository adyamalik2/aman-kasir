import { useState } from 'react'
import { useServiceWorker } from '@/hooks/useServiceWorker'
import { Icon } from '@/components/ui'

/**
 * Banner tetap yang muncul di atas bottom nav saat versi baru tersedia.
 * Pengguna bisa klik "Perbarui" untuk reload ke versi terbaru,
 * atau "✕" untuk tutup sementara (banner tidak muncul lagi hingga reload berikutnya).
 */
export default function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorker()
  const [dismissed, setDismissed] = useState(false)
  const [applying, setApplying] = useState(false)

  if (!updateAvailable || dismissed) return null

  const handleUpdate = () => {
    setApplying(true)
    applyUpdate()
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-3 pb-2"
    >
      <div className="flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-brand-gradient px-4 py-3 shadow-glow">
        {/* Ikon */}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white" aria-hidden="true">
          <Icon name="download" size={18} />
        </span>

        {/* Teks */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Versi baru tersedia!</p>
          <p className="text-xs text-white/80">Perbarui untuk mendapatkan fitur terbaru.</p>
        </div>

        {/* Tombol perbarui */}
        <button
          type="button"
          onClick={handleUpdate}
          disabled={applying}
          className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-primary hover:bg-neutral-100 disabled:opacity-60"
        >
          {applying ? 'Memuat...' : 'Perbarui'}
        </button>

        {/* Tombol tutup */}
        {!applying && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="flex shrink-0 items-center justify-center rounded-full p-1 text-white/70 hover:text-white"
            aria-label="Tutup notifikasi"
          >
            <Icon name="x" size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
