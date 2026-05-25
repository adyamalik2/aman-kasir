import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { Transaction, Customer } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { DexieTransactionRepository } from '@/repositories/implementations/DexieTransactionRepository'
import { hapticSuccess, hapticWarning } from '@/native/haptics'
import { db } from '@/infra/db/dexie'
import { CsvExportService } from '@/services/export/CsvExportService'

const txnRepo = new DexieTransactionRepository()
const csvService = new CsvExportService()

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Extended type untuk piutang dengan field tambahan saat lunas
type PiutangTxn = Transaction & {
  lunasAt?: string
  lunasMethod?: string
  lunasNotes?: string
}

// Cek apakah transaksi sudah ditandai lunas (field lunasAt di-inject saat tandai lunas)
function isLunas(txn: Transaction & { lunasAt?: string }): boolean {
  return Boolean(txn.lunasAt)
}

// ---------------------------------------------------------------------------

export default function PiutangScreen() {
  const [allPiutang, setAllPiutang] = useState<PiutangTxn[]>([])
  const [customerMap, setCustomerMap] = useState<Map<string, Customer>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'belum' | 'lunas'>('belum')

  // Dialog tandai lunas
  const [confirmTarget, setConfirmTarget] = useState<Transaction | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [lunasMethod, setLunasMethod] = useState('tunai')
  const [lunasNotes, setLunasNotes] = useState('')

  // Filter pencarian
  const [searchQuery, setSearchQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, customers] = await Promise.all([
        txnRepo.getPiutang(),
        db.customers.toArray(),
      ])
      setAllPiutang(data as PiutangTxn[])
      setCustomerMap(new Map(customers.map((c) => [c.id, c])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data piutang.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleTandaiLunas = async () => {
    if (!confirmTarget) return
    setConfirming(true)
    try {
      const now = new Date().toISOString()
      await txnRepo.updateTransaction(confirmTarget.id, {
        lunasAt: now,
        lunasMethod,
        lunasNotes: lunasNotes.trim() || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      await hapticSuccess()
      setAllPiutang((prev) =>
        prev.map((t) =>
          t.id === confirmTarget.id
            ? { ...t, lunasAt: now, lunasMethod, lunasNotes: lunasNotes.trim() || undefined }
            : t,
        ),
      )
      setConfirmTarget(null)
    } catch (err) {
      await hapticWarning()
      setError(err instanceof Error ? err.message : 'Gagal menandai lunas.')
    } finally {
      setConfirming(false)
    }
  }

  const belum = allPiutang.filter((t) => !isLunas(t))
  const lunas = allPiutang.filter((t) => isLunas(t))
  const baseShown = tab === 'belum' ? belum : lunas
  const shown = searchQuery.trim()
    ? baseShown.filter((t) => {
        const cust = t.customerId ? customerMap.get(t.customerId) : null
        const q = searchQuery.toLowerCase()
        return (
          t.invoiceNo.toLowerCase().includes(q) ||
          (cust?.nama.toLowerCase().includes(q) ?? false) ||
          (cust?.telepon?.toLowerCase().includes(q) ?? false) ||
          (t.notes?.toLowerCase().includes(q) ?? false)
        )
      })
    : baseShown

  const totalBelum = belum.reduce((s, t) => s + t.total, 0)

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/laporan"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-dark-elevated active:bg-neutral-200 dark:active:bg-dark-border"
        >
          <span className="text-xl text-primary">‹</span>
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">Laporan</p>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Piutang</h2>
        </div>
      </div>

      {/* Export CSV */}
      {allPiutang.length > 0 && (
        <button
          type="button"
          onClick={() =>
            csvService.exportPiutang(
              allPiutang.map((t) => ({
                invoiceNo: t.invoiceNo,
                date: t.date,
                customerName: t.customerId ? customerMap.get(t.customerId)?.nama : undefined,
                total: t.total,
                status: t.lunasAt ? 'Lunas' : 'Belum Lunas',
                lunasAt: t.lunasAt,
                lunasMethod: t.lunasMethod,
                lunasNotes: t.lunasNotes,
              })),
            )
          }
          className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-elevated px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-dark-muted hover:bg-neutral-50 dark:hover:bg-dark-border"
        >
          Export CSV
        </button>
      )}

      {/* Ringkasan total piutang belum lunas */}
      {!loading && belum.length > 0 && (
        <div className="rounded-xl border border-warning-200 dark:border-warning-700/50 bg-warning-50 dark:bg-warning-700/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warning-600 dark:text-warning-400">
            Total Piutang Belum Lunas
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-warning-700 dark:text-warning-300">
            {formatCurrency(totalBelum)}
          </p>
          <p className="text-xs text-warning-600 dark:text-warning-400">{belum.length} transaksi belum dilunasi</p>
        </div>
      )}

      {/* Tab belum / lunas */}
      <div className="flex gap-1">
        {(['belum', 'lunas'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              tab === t ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-dark-elevated text-neutral-600 dark:text-white hover:bg-neutral-200 dark:hover:bg-dark-border'
            }`}
          >
            {t === 'belum' ? `Belum Lunas (${belum.length})` : `Sudah Lunas (${lunas.length})`}
          </button>
        ))}
      </div>

      {/* Cari piutang */}
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Cari nama pelanggan atau no. invoice..."
        className="w-full rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-2.5 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-dark-muted focus:border-primary dark:focus:border-primary-400 focus:outline-none"
      />

      {error && (
        <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200 dark:bg-dark-border" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-3xl">
            {searchQuery.trim() ? '🔍' : tab === 'belum' ? '✅' : '📋'}
          </p>
          <p className="mt-2 font-semibold text-neutral-700 dark:text-white">
            {searchQuery.trim()
              ? 'Tidak ada hasil pencarian'
              : tab === 'belum' ? 'Tidak ada piutang yang belum lunas' : 'Belum ada piutang yang dilunasi'}
          </p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-dark-muted">
            {searchQuery.trim()
              ? 'Coba kata kunci lain'
              : tab === 'belum'
                ? 'Semua piutang sudah dibayar 👍'
                : 'Piutang yang sudah dilunasi akan muncul di sini'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((txn) => (
            <li
              key={txn.id}
              className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-neutral-400 dark:text-dark-muted">{formatTanggal(txn.date)}</p>
                  <p className="mt-0.5 font-semibold text-neutral-900 dark:text-white">{txn.invoiceNo}</p>
                  {txn.customerId && customerMap.get(txn.customerId) && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-primary dark:text-primary-400">
                      <span>👤</span>
                      {customerMap.get(txn.customerId)!.nama}
                      {customerMap.get(txn.customerId)!.telepon && (
                        <span className="font-normal text-neutral-400 dark:text-dark-muted">
                          · {customerMap.get(txn.customerId)!.telepon}
                        </span>
                      )}
                    </p>
                  )}
                  {txn.notes && (
                    <p className="mt-0.5 text-sm text-neutral-600 dark:text-dark-muted">📝 {txn.notes}</p>
                  )}
                  <p className="mt-1 font-mono font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(txn.total)}
                  </p>
                  {isLunas(txn) && txn.lunasAt && (
                    <p className="mt-0.5 text-xs text-success-600 dark:text-success-400">
                      ✓ Lunas {formatTanggal(txn.lunasAt)}
                      {txn.lunasMethod && <span> · {txn.lunasMethod}</span>}
                    </p>
                  )}
                  {isLunas(txn) && txn.lunasNotes && (
                    <p className="mt-0.5 text-xs text-neutral-400 dark:text-dark-muted">📝 {txn.lunasNotes}</p>
                  )}
                </div>

                {!isLunas(txn) && (
                  <button
                    type="button"
                    onClick={() => { setConfirmTarget(txn); setLunasMethod('tunai'); setLunasNotes('') }}
                    className="shrink-0 rounded-lg bg-success-50 dark:bg-success-700/20 px-3 py-2 text-xs font-bold text-success-700 dark:text-success-400 hover:bg-success-100 dark:hover:bg-success-700/30 active:scale-95"
                  >
                    Tandai Lunas
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Dialog konfirmasi tandai lunas */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div
            className="absolute inset-0"
            onClick={confirming ? undefined : () => setConfirmTarget(null)}
          />
          <div data-bottom-sheet="true" className="relative w-full max-w-sm rounded-t-2xl bg-white dark:bg-dark-elevated p-5 sm:rounded-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">
              Konfirmasi
            </p>
            <h3 className="mt-1 text-base font-bold text-neutral-900 dark:text-white">
              Tandai Lunas?
            </h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-dark-muted">
              <span className="font-semibold">{confirmTarget.invoiceNo}</span>
              {' '}—{' '}
              <span className="font-mono font-bold">{formatCurrency(confirmTarget.total)}</span>
            </p>
            {confirmTarget.customerId && customerMap.get(confirmTarget.customerId) && (
              <p className="mt-1 text-sm font-semibold text-primary dark:text-primary-400">
                👤 {customerMap.get(confirmTarget.customerId)!.nama}
              </p>
            )}
            {confirmTarget.notes && (
              <p className="mt-1 text-sm text-neutral-500 dark:text-dark-muted">📝 {confirmTarget.notes}</p>
            )}
            {/* Metode bayar */}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-neutral-600 dark:text-dark-muted mb-1">
                Metode Bayar
              </label>
              <select
                value={lunasMethod}
                onChange={(e) => setLunasMethod(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-primary-400"
              >
                <option value="tunai">Tunai</option>
                <option value="transfer">Transfer Bank</option>
                <option value="qris">QRIS</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
            <div className="mt-2">
              <label className="block text-xs font-semibold text-neutral-600 dark:text-dark-muted mb-1">
                Catatan Pelunasan (opsional)
              </label>
              <input
                type="text"
                value={lunasNotes}
                onChange={(e) => setLunasNotes(e.target.value)}
                placeholder="cth. Dibayar tunai siang ini"
                className="w-full rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-primary dark:focus:border-primary-400"
              />
            </div>

            <p className="mt-3 text-xs text-neutral-400 dark:text-dark-muted">
              Tindakan ini menandai piutang sebagai sudah dibayar. Riwayat transaksi tetap tersimpan.
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => void handleTandaiLunas()}
                disabled={confirming}
                className="w-full rounded-xl bg-success-700 py-3 text-sm font-bold text-white hover:bg-success-500 disabled:opacity-60"
              >
                {confirming ? 'Menyimpan...' : '✓ Ya, Tandai Lunas'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                disabled={confirming}
                data-android-back-close="true"
                className="w-full rounded-xl border border-neutral-200 dark:border-dark-border py-3 text-sm font-semibold text-neutral-700 dark:text-dark-muted"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
