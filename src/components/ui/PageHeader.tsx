import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export interface PageHeaderProps {
  /** Teks kecil di atas judul (kapital). */
  eyebrow?: string
  title: string
  description?: string
  icon?: IconName
  /** Elemen aksi di kanan (mis. tombol). */
  action?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  action,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <Icon name={icon} size={22} />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400">
              {eyebrow}
            </p>
          )}
          <h2 className="truncate text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-dark-muted">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export default PageHeader
