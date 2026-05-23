import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { PeriodInput } from '@/lib/period'
import { formatShortDate } from '@/lib/period'
import { formatCurrency } from '@/lib/currency'
import type { SalesReport } from '@/usecases/reports/types'
import { ImageExportService } from '@/services/export/ImageExportService'
import { getSalesReport } from './reportApi'
import PeriodFilter from './PeriodFilter'
import ExportButtons, { ExportButton } from './ExportButtons'

const imageService = new ImageExportService()

export default function SummaryTab() {
  const [period, setPeriod] = useState<PeriodInput>({ preset: '7days' })
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getSalesReport
      .execute(period)
      .then((data) => {
        if (!cancelled) setReport(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat ringkasan.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period])

  const chartData = (report?.breakdownPerHari ?? []).slice(-7).map((d) => ({
    label: formatShortDate(new Date(d.dayKey + 'T12:00:00')),
    omzet: d.omzet,
  }))

  const handleExportPng = async () => {
    setExporting(true)
    try {
      await imageService.exportElementToImage('report-summary-export')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal export gambar.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <PeriodFilter period={period} onChange={setPeriod} />

      <ExportButtons>
        <ExportButton
          label={exporting ? 'Membuat PNG...' : 'Export PNG'}
          onClick={() => void handleExportPng()}
          disabled={exporting || loading}
        />
      </ExportButtons>

      {error && (
        <div className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-neutral-500">Memuat ringkasan...</p>
      ) : report ? (
        <div id="report-summary-export" className="space-y-4 rounded-lg bg-surface p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard label="Total Omzet" value={formatCurrency(report.totalOmzet)} />
            <SummaryCard label="Total Transaksi" value={String(report.totalTransaksi)} />
            <SummaryCard label="Laba Kotor" value={formatCurrency(report.totalLabaKotor)} />
            <SummaryCard
              label="Rata-rata / Transaksi"
              value={formatCurrency(report.rataRataPerTransaksi)}
            />
          </div>

          <div className="rounded-lg border border-neutral-200 p-3">
            <p className="mb-3 text-xs font-semibold uppercase text-neutral-500">
              Omzet Harian (7 hari terakhir)
            </p>
            {chartData.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-400">Belum ada data penjualan.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`} />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value ?? 0)),
                      'Omzet',
                    ]}
                    labelStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="omzet" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-surface p-4">
      <p className="text-xs font-semibold uppercase text-neutral-500">{label}</p>
      <p className="mt-2 font-mono text-lg font-bold text-neutral-900">{value}</p>
    </div>
  )
}
