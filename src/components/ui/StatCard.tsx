import { Link } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger'

const TONE: Record<Tone, { box: string; accent: string }> = {
  primary: {
    box: 'bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300',
    accent: 'text-primary-600 dark:text-primary-400',
  },
  accent: {
    box: 'bg-accent-50 text-accent-600 dark:bg-accent-900/40 dark:text-accent-300',
    accent: 'text-accent-600 dark:text-accent-400',
  },
  success: {
    box: 'bg-success-50 text-success-600 dark:bg-success-700/20 dark:text-success-300',
    accent: 'text-success-600 dark:text-success-400',
  },
  warning: {
    box: 'bg-warning-50 text-warning-600 dark:bg-warning-700/20 dark:text-warning-300',
    accent: 'text-warning-600 dark:text-warning-400',
  },
  danger: {
    box: 'bg-danger-50 text-danger-600 dark:bg-danger-700/20 dark:text-danger-300',
    accent: 'text-danger-600 dark:text-danger-400',
  },
}

export interface StatCardProps {
  icon: IconName
  label: string
  value: string | number
  hint?: string
  tone?: Tone
  to?: string
  loading?: boolean
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'primary',
  to,
  loading,
}: StatCardProps) {
  const t = TONE[tone]
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.box}`}>
          <Icon name={icon} size={16} />
        </span>
        <p className="text-xs font-semibold text-neutral-500 dark:text-dark-muted">{label}</p>
      </div>
      {loading ? (
        <div className="skeleton mt-2 h-8 w-16 rounded-md" />
      ) : (
        <p className="mt-2 font-mono text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      )}
      {hint && <p className={`mt-0.5 text-xs font-semibold ${t.accent}`}>{hint}</p>}
    </>
  )

  const base =
    'rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-soft dark:border-dark-border dark:bg-dark-card'

  if (to) {
    return (
      <Link
        to={to}
        className={`block ${base} transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card active:scale-[0.98]`}
      >
        {body}
      </Link>
    )
  }
  return <div className={base}>{body}</div>
}

export default StatCard
