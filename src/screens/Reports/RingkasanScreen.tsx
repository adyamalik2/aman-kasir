import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '@/lib/currency'
import { resolvePeriod, startOfDay, endOfDay, type PeriodPreset, type PeriodInput } from '@/lib/period'
import { db } from '@/infra/db/dexie'
import { VerticalBarChart } from './components/VerticalBarChart'

// ---------------------------------------------------------------------------
// Tipe & helpers
// ---------------------------------------------------------------------------

interface PeriodStats {
  transaksi: number
  pendapatan: number
  keuntungan: number
}

interface HourEntry {
  label: string
  value: number
}

interface DayEntry {
  label: string
  value: number
}

const PRESETS: { preset: PeriodPreset; label: string }[] = [
  { preset: 'today', label: 'Hari Ini' },
  { preset: 'yesterday', label: 'Kemarin' },
  { preset: '7days', label: '7 Hari' },
  { preset: 'thisMonth', label: 'Bulan Ini' },
  { preset: 'custom', label: 'Custom' },
]

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function fmtRupiah(v: number): string {
  if (v >= 1_000_000) return `${Math.round(v / 100_000) / 10}jt`
  if (v >= 1_000) return `${Math.round(v / 1_000)}rb`
  return String(Math.round(v))
}

/** Hitung stats dari transactions + items di rentang tertentu */
async function fetchStats(start: Date, end: Date): Promise<PeriodStats> {
  const txns = await db.transactions
    .filter((t) => t.status === 'completed' && t.date >= start.toISOString() && t.date <= end.toISOString())
    .toArray()

  if (txns.length === 0) return { transaksi: 0, pendapatan: 0, keuntungan: 0 }

  const ids = txns.map((t) => t.id)
  const items = await db.transactionItems.where('transactionId').anyOf(ids).toArray()

  const pendapatan = txns.reduce((s, t) => s + t.total, 0)
  const keuntungan = items.reduce((s, it) => s + (it.price - it.costPrice) * it.qty, 0)

  return { transaksi: txns.length, pendapatan, keuntungan }
}

/** Ambil data chart per jam untuk satu hari */
async function fetchHourly(date: Date, metric: ChartMetric): Promise<HourEntry[]> {
  const start = startOfDay(date)
  const end = endOfDay(date)
  const txns = await db.transactions
    .filter((t) => t.status === 'completed' && t.date >= start.toISOString() && t.date <= end.toISOString())
    .toArray()

  if (txns.length === 0) return []

  const byHour: Record<number, { pendapatan: number; count: number }> = {}
  for (const t of txns) {
    const h = new Date(t.date).getHours()
    if (!byHour[h]) byHour[h] = { pendapatan: 0, count: 0 }
    byHour[h].pendapatan += t.total
    byHour[h].count += 1
  }

  const activeHours = Object.keys(byHour).map(Number).sort((a, b) => a - b)
  const minH = Math.max(0, activeHours[0] - 1)
  const maxH = Math.min(23, (activeHours[activeHours.length - 1] ?? 0) + 1)

  return Array.from({ length: maxH - minH + 1 }, (_, i) => {
    const h = minH + i
    const d = byHour[h]
    return {
      label: `${h}`,
      value: metric === 'count' ? (d?.count ?? 0) : (d?.pendapatan ?? 0),
    }
  })
}

/** Ambil data chart per hari dari rentang */
async function fetchDaily(start: Date, end: Date, metric: ChartMetric): Promise<DayEntry[]> {
  const txns = await db.transactions
    .filter((t) => t.status === 'completed' && t.date >= start.toISOString() && t.date <= end.toISOString())
    .toArray()

  if (txns.length === 0) return []

  const byDay: Record<string, { pendapatan: number; count: number }> = {}
  for (const t of txns) {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!byDay[key]) byDay[key] = { pendapatan: 0, count: 0 }
    byDay[key].pendapatan += t.total
    byDay[key].count += 1
  }

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      const d = new Date(`${key}T12:00:00`)
      const label = HARI[d.getDay()]
      return {
        label,
        value: metric === 'count' ? v.count : v.pendapatan,
      }
    })
}

/** Hitung rentang periode sebelumnya untuk perbandingan */
function getPreviousRange(input: PeriodInput): { start: Date; end: Date } | null {
  const now = new Date()
  switch (input.preset) {
    case 'today': {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return { start: startOfDay(y), end: endOfDay(y) }
    }
    case 'yesterday': {
      const d = new Date(now)
      d.setDate(d.getDate() - 2)
      return { start: startOfDay(d), end: endOfDay(d) }
    }
    case '7days': {
      const s = new Date(now)
      s.setDate(s.getDate() - 13)
      const e = new Date(now)
      e.setDate(e.getDate() - 7)
      return { start: startOfDay(s), end: endOfDay(e) }
    }
    case 'thisMonth': {
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1)
      return { start: startOfDay(prevStart), end: endOfDay(prevEnd) }
    }
    default:
      return null
  }
}

function pctChange(curr: number, prev: number): string {
  if (prev === 0) return curr > 0 ? '+∞%' : '0%'
  const pct = ((curr - prev) / prev) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
}

type ChartMetric = 'count' | 'pendapatan'

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

export default function RingkasanScreen() {
  const [period, setPeriod] = useState<PeriodInput>({ preset: 'today' })
  const [stats, setStats] = useState<PeriodStats | null>(null)
  const [prevStats, setPrevStats] = useState<PeriodStats | null>(null)
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([])
  const [metric, setMetric] = useState<ChartMetric>('pendapatan')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const run = async () => {
      const { start, end } = resolvePeriod(period)

      const [curr, prev] = await Promise.all([
        fetchStats(start, end),
        (async () => {
          const prevRange = getPreviousRange(period)
          return prevRange ? fetchStats(prevRange.start, prevRange.end) : null
        })(),
      ])

      if (cancelled) return
      setStats(curr)
      setPrevStats(prev)

      // Chart data
      const isSingleDay = period.preset === 'today' || period.preset === 'yesterday'
      if (isSingleDay) {
        const date = period.preset === 'yesterday'
          ? (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d })()
          : new Date()
        setChartData(await fetchHourly(date, metric))
      } else {
        setChartData(await fetchDaily(start, end, metric))
      }
    }

    run().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal memuat data.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [period, metric])

  const isSingleDay = period.preset === 'today' || period.preset === 'yesterday'
  const chartLabel = isSingleDay ? 'Transaksi per Jam' : 'Transaksi per Hari'

  return (
    <section className="space-y-4">
      {/* Header + back */}
      <div className="flex items-center gap-3">
        <Link
          to="/laporan"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-dark-elevated active:bg-neutral-200 dark:active:bg-dark-border"
        >
          <span className="text-xl text-primary">‹</span>
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">Laporan</p>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Ringkasan Penjualan</h2>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {PRESETS.map(({ preset, label }) => (
          <button
            key={preset}
            type="button"
            onClick={() => setPeriod({ preset })}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              period.preset === preset
                ? 'bg-primary text-white'
                : 'bg-neutral-100 dark:bg-dark-elevated text-neutral-700 dark:text-white hover:bg-neutral-200 dark:hover:bg-dark-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {period.preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-neutral-500">
            Dari
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value)
                if (e.target.value) {
                  setPeriod({ preset: 'custom', customStart: e.target.value, customEnd: customEnd || e.target.value })
                }
              }}
              className="ml-1 rounded border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-900 dark:text-white px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-neutral-500">
            Sampai
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value)
                if (e.target.value) {
                  setPeriod({ preset: 'custom', customStart: customStart || e.target.value, customEnd: e.target.value })
                }
              }}
              className="ml-1 rounded border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-900 dark:text-white px-2 py-1 text-sm"
            />
          </label>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-neutral-400">Memuat ringkasan...</div>
      ) : stats ? (
        <>
          {/* Stats cards */}
          <div className="space-y-2">
            <StatCard
              label="Jumlah Transaksi"
              value={String(stats.transaksi)}
              suffix="transaksi"
              change={prevStats ? pctChange(stats.transaksi, prevStats.transaksi) : undefined}
              positive={prevStats ? stats.transaksi >= prevStats.transaksi : undefined}
            />
            <StatCard
              label="Pendapatan"
              value={formatCurrency(stats.pendapatan)}
              change={prevStats ? pctChange(stats.pendapatan, prevStats.pendapatan) : undefined}
              positive={prevStats ? stats.pendapatan >= prevStats.pendapatan : undefined}
            />
            <StatCard
              label="Keuntungan (Laba Kotor)"
              value={formatCurrency(stats.keuntungan)}
              change={prevStats ? pctChange(stats.keuntungan, prevStats.keuntungan) : undefined}
              positive={prevStats ? stats.keuntungan >= prevStats.keuntungan : undefined}
            />
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-dark-muted">
                {chartLabel}
              </p>
              <div className="flex gap-1">
                {(['pendapatan', 'count'] as ChartMetric[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetric(m)}
                    className={`rounded-full px-2 py-1 text-xs font-semibold transition-colors ${
                      metric === m ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-dark-elevated text-neutral-600 dark:text-white'
                    }`}
                  >
                    {m === 'count' ? 'Jml' : 'Pendapatan'}
                  </button>
                ))}
              </div>
            </div>
            <VerticalBarChart
              data={chartData}
              height={160}
              formatValue={metric === 'pendapatan' ? fmtRupiah : undefined}
              emptyText="Belum ada transaksi pada periode ini"
            />
          </div>
        </>
      ) : null}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Sub-komponen
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  suffix,
  change,
  positive,
}: {
  label: string
  value: string
  suffix?: string
  change?: string
  positive?: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-dark-border bg-surface dark:bg-dark-card px-4 py-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-dark-muted">{label}</p>
        <p className="mt-1 font-mono text-xl font-bold text-neutral-900 dark:text-white">
          {value}
          {suffix && <span className="ml-1 text-xs font-normal text-neutral-400">{suffix}</span>}
        </p>
      </div>
      {change !== undefined && positive !== undefined && (
        <span
          className={`rounded-full px-2 py-1 text-xs font-bold ${
            positive ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'
          }`}
        >
          {change}
        </span>
      )}
    </div>
  )
}
