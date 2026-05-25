import { Link } from 'react-router-dom'

const APP_VERSION = '1.0.0'

interface InfoRowProps {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-neutral-100 dark:border-dark-border last:border-0">
      <span className="text-sm text-neutral-500 dark:text-dark-muted">{label}</span>
      <span className="text-sm font-semibold text-neutral-900 dark:text-white">{value}</span>
    </div>
  )
}

export default function AboutScreen() {
  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/lainnya"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 dark:border-dark-border text-neutral-500 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-elevated"
          aria-label="Kembali"
        >
          ‹
        </Link>
        <div>
          <p className="text-sm font-medium text-neutral-500 dark:text-dark-muted">Lainnya</p>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Tentang</h2>
        </div>
      </div>

      {/* Hero */}
      <div className="rounded-2xl bg-primary dark:bg-dark-card border border-primary-900 dark:border-dark-border p-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 dark:bg-white/10 text-3xl">
          🏪
        </div>
        <h1 className="text-xl font-bold text-white">AMAN Kasir</h1>
        <p className="mt-1 text-sm text-white/70">
          Kasir yang Jalan Terus, Walau Sinyal Pergi.
        </p>
        <span className="mt-3 inline-block rounded-full bg-white/15 dark:bg-white/10 px-3 py-1 text-xs font-semibold text-white">
          v{APP_VERSION}
        </span>
      </div>

      {/* Info Aplikasi */}
      <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 space-y-0">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">
          Informasi Aplikasi
        </h3>
        <InfoRow label="Versi" value={APP_VERSION} />
        <InfoRow label="Platform" value="PWA + Android (Capacitor)" />
        <InfoRow label="Database" value="IndexedDB (Offline-first)" />
        <InfoRow label="Lisensi" value="Proprietary" />
      </div>

      {/* Fitur Utama */}
      <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">
          Fitur Utama
        </h3>
        <ul className="space-y-2">
          {[
            { icon: '🛒', text: 'Kasir POS cepat — tunai, QRIS, transfer, piutang' },
            { icon: '💰', text: 'Diskon per transaksi & tombol uang pas otomatis' },
            { icon: '📦', text: 'Manajemen produk, stok, koreksi & histori pergerakan' },
            { icon: '📊', text: 'Laporan penjualan, laba & margin, produk terlaris' },
            { icon: '💳', text: 'Piutang lengkap — pelacakan, pelunasan & export CSV' },
            { icon: '👤', text: 'Manajemen pelanggan, detail & riwayat transaksi' },
            { icon: '🖨️', text: 'Struk digital — cetak, share JPG/PDF, WhatsApp' },
            { icon: '☁️', text: 'Backup lokal & cloud (Google Drive)' },
            { icon: '📵', text: 'Bekerja 100% tanpa internet (offline-first)' },
          ].map((item) => (
            <li key={item.text} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-base">{item.icon}</span>
              <span className="text-sm text-neutral-700 dark:text-dark-muted">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pengembang */}
      <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 space-y-0">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">
          Pengembang
        </h3>
        <InfoRow label="Dikembangkan oleh" value="Adya Malik" />
        <InfoRow label="Email" value="adya.malik2@gmail.com" />
        <InfoRow label="Negara" value="🇮🇩 Indonesia" />
      </div>

      {/* Tech Stack */}
      <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">
          Teknologi
        </h3>
        <div className="flex flex-wrap gap-2">
          {['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Dexie.js', 'Capacitor', 'Firebase', 'Zustand'].map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-elevated px-3 py-1 text-xs font-semibold text-neutral-600 dark:text-dark-muted"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="pb-2 text-center text-xs text-neutral-400 dark:text-dark-muted">
        © 2024–2026 AMAN Kasir · Dibuat dengan ❤️ untuk UMKM Indonesia
      </p>
    </section>
  )
}
