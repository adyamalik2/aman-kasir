import type { PeriodInput, PeriodPreset } from '@/lib/period'
import { PERIOD_PRESET_LABELS } from '@/lib/period'

const PRESETS: PeriodPreset[] = ['today', 'yesterday', '7days', '30days', 'custom']

interface PeriodFilterProps {
  period: PeriodInput
  onChange: (period: PeriodInput) => void
}

export default function PeriodFilter({ period, onChange }: PeriodFilterProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange({ ...period, preset })}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              period.preset === preset
                ? 'bg-primary text-white'
                : 'bg-neutral-100 dark:bg-dark-elevated text-neutral-700 dark:text-white hover:bg-neutral-200 dark:hover:bg-dark-border'
            }`}
          >
            {PERIOD_PRESET_LABELS[preset]}
          </button>
        ))}
      </div>

      {period.preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-neutral-500 dark:text-dark-muted">
            Dari
            <input
              type="date"
              value={period.customStart ?? ''}
              onChange={(e) =>
                onChange({ ...period, customStart: e.target.value })
              }
              className="ml-1 rounded border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-900 dark:text-white px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-neutral-500 dark:text-dark-muted">
            Sampai
            <input
              type="date"
              value={period.customEnd ?? ''}
              onChange={(e) =>
                onChange({ ...period, customEnd: e.target.value })
              }
              className="ml-1 rounded border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-900 dark:text-white px-2 py-1 text-sm"
            />
          </label>
        </div>
      )}
    </div>
  )
}
