import { Icon, BackHeader, type IconName } from '@/components/ui'

const APP_VERSION = '1.0.0'

interface InfoRowProps {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-100 py-2.5 last:border-0 dark:border-dark-border">
      <span className="text-sm text-neutral-500 dark:text-dark-muted">{label}</span>
      <span className="text-sm font-semibold text-neutral-900 dark:text-white">{value}</span>
    </div>
  )
}

const FEATURES: { icon: IconName; text: string }[] = [
  { icon: 'cart', text: 'Kasir POS cepat — tunai, QRIS, transfer, piutang' },
  { icon: 'coins', text: 'Diskon per transaksi & tombol uang pas otomatis' },
  { icon: 'package', text: 'Manajemen produk, stok, koreksi & histori pergerakan' },
  { icon: 'chart', text: 'Laporan penjualan, laba & margin, produk terlaris' },
  { icon: 'credit-card', text: 'Piutang lengkap — pelacakan, pelunasan & export CSV' },
  { icon: 'users', text: 'Manajemen pelanggan, detail & riwayat transaksi' },
  { icon: 'printer', text: 'Struk digital — cetak, share JPG/PDF, WhatsApp' },
  { icon: 'cloud', text: 'Backup lokal & cloud (Google Drive)' },
  { icon: 'wifi-off', text: 'Bekerja 100% tanpa internet (offline-first)' },
]

const SECTION_CARD =
  'rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-soft dark:border-dark-border dark:bg-dark-card'

export default function AboutScreen() {
  return (
    <section className="space-y-5">
      <BackHeader eyebrow="Lainnya" title="Tentang" icon="info" />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-mesh p-6 text-center shadow-lifted">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-white">
          <Icon name="store" size={32} />
        </div>
        <h1 className="text-xl font-bold text-white [text-shadow:0_1px_3px_rgba(15,23,42,0.22)]">AMAN Kasir</h1>
        <p className="mt-1 text-sm text-white/90">Kasir yang Jalan Terus, Walau Sinyal Pergi.</p>
        <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
          v{APP_VERSION}
        </span>
      </div>

      {/* Info Aplikasi */}
      <div className={SECTION_CARD}>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">
          Informasi Aplikasi
        </h3>
        <InfoRow label="Versi" value={APP_VERSION} />
        <InfoRow label="Platform" value="PWA + Android (Capacitor)" />
        <InfoRow label="Database" value="IndexedDB (Offline-first)" />
        <InfoRow label="Lisensi" value="Proprietary" />
      </div>

      {/* Fitur Utama */}
      <div className={SECTION_CARD}>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">
          Fitur Utama
        </h3>
        <ul className="space-y-2.5">
          {FEATURES.map((item) => (
            <li key={item.text} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                <Icon name={item.icon} size={15} />
              </span>
              <span className="pt-0.5 text-sm text-neutral-700 dark:text-dark-muted">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pengembang */}
      <div className={SECTION_CARD}>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">
          Pengembang
        </h3>
        <InfoRow label="Dikembangkan oleh" value="Adya Malik" />
        <InfoRow label="Email" value="adya.malik2@gmail.com" />
        <InfoRow label="Negara" value="Indonesia" />
      </div>

      {/* Tech Stack */}
      <div className={SECTION_CARD}>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">
          Teknologi
        </h3>
        <div className="flex flex-wrap gap-2">
          {['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Dexie.js', 'Capacitor', 'Firebase', 'Zustand'].map(
            (tech) => (
              <span
                key={tech}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-600 dark:border-dark-border dark:bg-dark-elevated dark:text-dark-muted"
              >
                {tech}
              </span>
            ),
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-xs text-neutral-400 dark:text-dark-muted">
        © 2024–2026 AMAN Kasir · Dibuat dengan
        <Icon name="heart" size={13} className="text-danger-500" />
        untuk UMKM Indonesia
      </p>
    </section>
  )
}
