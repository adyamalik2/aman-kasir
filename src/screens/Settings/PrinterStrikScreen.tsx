import { useState, useEffect, useRef } from 'react'
import { Icon, BackHeader, type IconName } from '@/components/ui'
import {
  getReceiptSettings,
  setReceiptSettings,
  DEFAULT_RECEIPT_SETTINGS,
  type PrinterSettings,
} from '@/lib/receiptSettings'
import { getStoreProfile } from '@/lib/storeProfile'
import { ReceiptPreview } from '@/components/receipt/ReceiptPreview'
import type { ReceiptSnapshot } from '@/components/receipt/receiptUtils'

// Struk dummy untuk tombol Test
function makeDummySnapshot(profile: ReturnType<typeof getStoreProfile>): ReceiptSnapshot {
  const now = new Date().toISOString()
  return {
    transaction: {
      id: 'dummy',
      invoiceNo: 'INV-TEST-001',
      date: now,
      status: 'completed',
      subtotal: 25000,
      discount: 0,
      tax: 0,
      total: 25000,
      paidAmount: 30000,
      changeAmount: 5000,
      paymentMethod: 'cash',
      syncStatus: 'local_only',
      syncVersion: 1,
      createdAt: now,
      updatedAt: now,
    },
    items: [
      {
        productName: 'Kertas A4 80gsm',
        sku: 'PRD-001',
        qty: 2,
        price: 10000,
        discount: 0,
        subtotal: 20000,
      },
      {
        productName: 'Pulpen Hitam',
        sku: 'PRD-002',
        qty: 1,
        price: 5000,
        discount: 0,
        subtotal: 5000,
      },
    ],
    storeProfile: profile,
    cashierName: 'Kasir',
  }
}

// ---------------------------------------------------------------------------

export default function PrinterStrikScreen() {
  const [form, setForm] = useState<PrinterSettings>(() => getReceiptSettings())
  const [saved, setSaved] = useState(false)
  const [showTest, setShowTest] = useState(false)
  const previewRef = useRef<HTMLDivElement | null>(null)

  const storeProfile = getStoreProfile()
  const dummySnapshot = makeDummySnapshot(storeProfile)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(t)
  }, [saved])

  const update = <K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    setReceiptSettings(form)
    setSaved(true)
    setShowTest(false)
  }

  const handleSaveAndTest = () => {
    setReceiptSettings(form)
    setSaved(true)
    setShowTest(true)
    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <BackHeader eyebrow="Lainnya" title="Printer dan Struk" icon="printer" />

      {/* ── Section: Struk ─────────────────────────────────── */}
      <Card title="Tampilan Struk">
        <ToggleRow
          label="Tampilkan nama toko"
          description="Nama toko muncul di bagian atas struk"
          checked={form.tampilkanNamaToko}
          onChange={(v) => update('tampilkanNamaToko', v)}
        />
        <ToggleRow
          label="Tampilkan nomor transaksi"
          description="No. invoice / kode transaksi ditampilkan di struk"
          checked={form.tampilkanNomorTransaksi}
          onChange={(v) => update('tampilkanNomorTransaksi', v)}
        />
        <ToggleRow
          label="Auto print setelah transaksi"
          description="Langsung buka dialog print / simpan setelah kasir selesai"
          checked={form.autoPrint}
          onChange={(v) => update('autoPrint', v)}
        />
      </Card>

      {/* ── Section: Teks ──────────────────────────────────── */}
      <Card title="Teks Struk">
        <div className="space-y-3">
          <TextInput
            label="Teks header tambahan"
            description="Ditampilkan di bawah nama toko (kosongkan jika tidak perlu)"
            value={form.headerTeks}
            onChange={(v) => update('headerTeks', v)}
            placeholder="Selamat datang! Pelayanan terbaik untuk Anda."
          />
          <TextInput
            label="Teks footer"
            description="Bagian bawah struk — ucapan terima kasih, dll."
            value={form.footerTeks}
            onChange={(v) => update('footerTeks', v)}
            placeholder="Terima kasih telah berbelanja"
          />
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-dark-muted">
              Margin bawah (baris kosong)
            </label>
            <p className="mb-1 text-xs text-neutral-400 dark:text-dark-muted">
              Baris kosong setelah footer — berguna untuk thermal printer yang perlu jarak potong
            </p>
            <div className="flex items-center gap-3">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update('marginBawah', n)}
                  className={`h-9 w-9 rounded-full text-sm font-bold transition-colors ${
                    form.marginBawah === n
                      ? 'bg-primary text-white'
                      : 'border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated text-neutral-600 dark:text-dark-muted hover:border-primary/40'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Section: Printer ───────────────────────────────── */}
      <Card title="Printer">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-dark-muted">Jenis koneksi</label>
          <div className="space-y-2">
            {(
              [
                { value: 'browser', icon: 'monitor', label: 'Browser Print', desc: 'Print via dialog browser / sistem (tersedia sekarang)' },
                { value: 'bluetooth', icon: 'bluetooth', label: 'Bluetooth', desc: 'Thermal printer Bluetooth (segera tersedia)', soon: true },
                { value: 'usb', icon: 'plug', label: 'USB / Kabel', desc: 'Thermal printer USB langsung (segera tersedia)', soon: true },
              ] as { value: PrinterSettings['jenisKoneksi']; icon: IconName; label: string; desc: string; soon?: boolean }[]
            ).map(({ value, icon, label, desc, soon }) => (
              <button
                key={value}
                type="button"
                disabled={soon}
                onClick={() => !soon && update('jenisKoneksi', value)}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  form.jenisKoneksi === value && !soon
                    ? 'border-primary bg-primary/5 dark:bg-primary-900/20'
                    : soon
                      ? 'border-neutral-100 dark:border-dark-border bg-neutral-50 dark:bg-dark-elevated opacity-60'
                      : 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated hover:border-neutral-300 dark:hover:border-dark-muted'
                }`}
              >
                <span
                  className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                    form.jenisKoneksi === value && !soon
                      ? 'border-primary bg-primary'
                      : 'border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon name={icon} size={16} className="text-neutral-500 dark:text-dark-muted" />
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">{label}</span>
                    {soon && (
                      <span className="rounded-full bg-neutral-200 dark:bg-dark-border px-2 py-0.5 text-xs font-semibold text-neutral-500 dark:text-dark-muted">
                        Segera
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-dark-muted">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {form.jenisKoneksi === 'browser' && (
            <div className="flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-primary dark:bg-primary-900/20 dark:text-primary-400">
              <Icon name="info" size={14} className="mt-0.5 shrink-0" />
              <span>Saat "Printer" ditekan di struk, browser akan membuka dialog print sistem. Anda bisa pilih printer atau simpan sebagai PDF.</span>
            </div>
          )}
        </div>
      </Card>

      {/* ── Tombol aksi ────────────────────────────────────── */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSaveAndTest}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Icon name="printer" size={18} /> Simpan dan Test Struk
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated py-3 text-sm font-bold text-neutral-700 dark:text-white hover:bg-neutral-50 dark:hover:bg-dark-border"
        >
          Simpan
        </button>

        {saved && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-success-50 px-3 py-2 text-center text-sm font-semibold text-success-700 dark:bg-success-700/20 dark:text-success-400">
            <Icon name="check-circle" size={16} /> Pengaturan disimpan
          </div>
        )}

        {/* Reset ke default */}
        <button
          type="button"
          onClick={() => setForm({ ...DEFAULT_RECEIPT_SETTINGS })}
          className="w-full text-xs text-neutral-400 dark:text-dark-muted underline hover:text-neutral-600 dark:hover:text-white"
        >
          Reset ke default
        </button>
      </div>

      {/* ── Preview struk ──────────────────────────────────── */}
      {showTest && (
        <div ref={previewRef} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-dark-muted">
            Preview Struk
          </p>
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-white">
            <ReceiptPreview
              transaction={dummySnapshot.transaction}
              items={dummySnapshot.items}
              storeProfile={dummySnapshot.storeProfile}
              cashierName={dummySnapshot.cashierName}
              settings={form}
            />
          </div>
          <p className="text-center text-xs text-neutral-400 dark:text-dark-muted">
            Ini preview tampilan struk dengan pengaturan saat ini
          </p>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Sub-komponen UI
// ---------------------------------------------------------------------------

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-4 space-y-3">
      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{title}</h3>
      {children}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-800 dark:text-white">{label}</p>
        <p className="text-xs text-neutral-400 dark:text-dark-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-neutral-200 dark:bg-dark-border'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function TextInput({
  label,
  description,
  value,
  onChange,
  placeholder,
}: {
  label: string
  description: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-600 dark:text-dark-muted">{label}</label>
      <p className="mb-1 text-xs text-neutral-400 dark:text-dark-muted">{description}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-dark-muted px-3 py-2 text-sm focus:border-primary dark:focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-primary-400"
      />
    </div>
  )
}
