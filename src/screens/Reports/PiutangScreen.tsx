import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { Transaction } from '@/domain'
import { formatCurrency } from '@/lib/currency'
import { DexieTransactionRepository } from '@/repositories/implementations/DexieTransactionRepository'
import { hapticSuccess, hapticWarning } from '@/native/haptics'

const txnRepo = new DexieTransactionRepository()

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Cek apakah transaksi sudah ditandai lunas (field lunasAt di-inject saat tandai lunas)
function isLunas(txn: Transaction & { lunasAt?: string }): boolean {
  return Boolean(txn.lunasAt)
}

// ---------------------------------------------------------------------------

export default function PiutangScreen() {
  const [allPiutang, setAllPiutang] = useState<(Transaction & { lunasAt?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'belum' | 'lunas'>('belum')

  // Dialog tandai lunas
  const [confirmTarget, setConfirmTarget] = useState<Transaction | null>(null)
  const [confirming, setConfirming] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await txnRepo.getPiutang()
      setAllPiutang(data as (Transaction & { lunasAt?: string })[])
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
      await txnRepo.updateTransaction(confirmTarget.id, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lunasAt: new Date().toISOString() } as any)
      await hapticSuccess()
      setAllPiutang((prev) =>
        prev.map((t) =>
          t.id === confirmTarget.id
            ? { ...t, lunasAt: new Date().toISOString() }
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
  const shown = tab === 'belum' ? belum : lunas

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
            {tab === 'belum' ? '✅' : '📋'}
          </p>
          <p className="mt-2 font-semibold text-neutral-700 dark:text-white">
            {tab === 'belum' ? 'Tidak ada piutang yang belum lunas' : 'Belum ada piutang yang dilunasi'}
          </p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-dark-muted">
            {tab === 'belum'
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
                  {txn.notes && (
                    <p className="mt-0.5 text-sm text-neutral-600 dark:text-dark-muted">📝 {txn.notes}</p>
                  )}
                  <p className="mt-1 font-mono font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(txn.total)}
                  </p>
                  {isLunas(txn) && txn.lunasAt && (
                    <p className="mt-0.5 text-xs text-success-600">
                      ✓ Lunas {formatTanggal(txn.lunasAt)}
                    </p>
                  )}
                </div>

                {!isLunas(txn) && (
                  <button
                    type="button"
                    onClick={() => setConfirmTarget(txn)}
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
          <div className="w-full max-w-sm rounded-t-2xl bg-white dark:bg-dark-elevated p-5 sm:rounded-2xl">
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
            {confirmTarget.notes && (
              <p className="mt-1 text-sm text-neutral-500 dark:text-dark-muted">📝 {confirmTarget.notes}</p>
            )}
            <p className="mt-2 text-xs text-neutral-400 dark:text-dark-muted">
              Tindakan ini menandai piutang sebagai sudah dibayar. Riwayat transaksi tetap tersimpan.
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => void handleTandaiLunas()}
                disabled={confirming}
                className="w-full rounded-xl bg-success-600 py-3 text-sm font-bold text-white hover:bg-success-700 disabled:opacity-60"
              >
                {confirming ? 'Menyimpan...' : '✓ Ya, Tandai Lunas'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                disabled={confirming}
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
