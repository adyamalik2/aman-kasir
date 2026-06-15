import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

export interface BackHeaderProps {
  /** Tujuan tombol kembali. Default: '/lainnya'. */
  to?: string
  eyebrow?: string
  title: string
  icon?: IconName
  action?: ReactNode
  className?: string
}

/** Header sub-halaman dengan tombol kembali bergaya modern. */
export function BackHeader({
  to = '/lainnya',
  eyebrow,
  title,
  icon,
  action,
  className = '',
}: BackHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to={to}
          aria-label="Kembali"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 active:scale-95 dark:border-dark-border dark:bg-dark-card dark:text-dark-muted dark:hover:bg-dark-elevated"
        >
          <Icon name="chevron-left" size={20} />
        </Link>
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400">
              {eyebrow}
            </p>
          )}
          <h2 className="flex items-center gap-2 truncate text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {icon && <Icon name={icon} size={20} className="shrink-0 text-primary-500" />}
            {title}
          </h2>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export default BackHeader
