export type PeriodPreset = 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'custom'

export interface PeriodInput {
  preset: PeriodPreset
  /** YYYY-MM-DD — wajib jika preset custom */
  customStart?: string
  customEnd?: string
}

export interface DateRange {
  start: Date
  end: Date
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Resolve preset periode laporan ke rentang tanggal lokal (awal–akhir hari).
 */
export function resolvePeriod(input: PeriodInput): DateRange {
  const now = new Date()

  switch (input.preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'yesterday': {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return { start: startOfDay(y), end: endOfDay(y) }
    }
    case '7days': {
      const start = new Date(now)
      start.setDate(start.getDate() - 6)
      return { start: startOfDay(start), end: endOfDay(now) }
    }
    case '30days': {
      const start = new Date(now)
      start.setDate(start.getDate() - 29)
      return { start: startOfDay(start), end: endOfDay(now) }
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: startOfDay(start), end: endOfDay(now) }
    }
    case 'custom': {
      const startStr = input.customStart ?? input.customEnd
      const endStr = input.customEnd ?? input.customStart
      if (!startStr || !endStr) {
        return { start: startOfDay(now), end: endOfDay(now) }
      }
      const start = startOfDay(new Date(`${startStr}T00:00:00`))
      const end = endOfDay(new Date(`${endStr}T00:00:00`))
      if (start.getTime() > end.getTime()) {
        return {
          start: startOfDay(new Date(`${endStr}T00:00:00`)),
          end: endOfDay(new Date(`${startStr}T00:00:00`)),
        }
      }
      return { start, end }
    }
    default:
      return { start: startOfDay(now), end: endOfDay(now) }
  }
}

/** Label chip periode untuk UI */
export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  today: 'Hari Ini',
  yesterday: 'Kemarin',
  '7days': '7 Hari',
  '30days': '30 Hari',
  thisMonth: 'Bulan Ini',
  custom: 'Custom',
}

/** Format tanggal singkat untuk sumbu chart (contoh: 23 Mei) */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

/** Kunci hari lokal YYYY-MM-DD untuk agregasi */
export function toDayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
