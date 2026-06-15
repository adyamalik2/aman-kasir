import { Link } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

const TONE_BG: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300',
  accent: 'bg-accent-50 text-accent-600 dark:bg-accent-900/40 dark:text-accent-300',
  success: 'bg-success-50 text-success-600 dark:bg-success-700/20 dark:text-success-300',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-700/20 dark:text-warning-300',
  danger: 'bg-danger-50 text-danger-600 dark:bg-danger-700/20 dark:text-danger-300',
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-dark-elevated dark:text-dark-muted',
}

export interface ListTileProps {
  to?: string
  icon: IconName
  tone?: Tone
  title: string
  description?: string
  badge?: string
  disabled?: boolean
}

/** Baris menu modern: ikon dalam kotak warna + judul + deskripsi + chevron. */
export function ListTile({
  to,
  icon,
  tone = 'primary',
  title,
  description,
  badge,
  disabled,
}: ListTileProps) {
  const inner = (
    <>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONE_BG[tone]}`}>
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">{title}</p>
          {badge && (
            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-dark-border dark:text-dark-muted">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 text-xs leading-5 text-neutral-500 dark:text-dark-muted">{description}</p>
        )}
      </div>
      {to && !disabled && (
        <Icon name="chevron-right" size={18} className="shrink-0 text-neutral-300 dark:text-dark-border" />
      )}
    </>
  )

  const base =
    'flex items-center gap-4 rounded-2xl border border-neutral-200/80 bg-white p-3.5 dark:border-dark-border dark:bg-dark-card'

  if (to && !disabled) {
    return (
      <Link
        to={to}
        className={`${base} shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card active:scale-[0.99]`}
      >
        {inner}
      </Link>
    )
  }

  return <div className={`${base} opacity-60`}>{inner}</div>
}

export default ListTile
