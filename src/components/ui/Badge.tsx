import type { ReactNode } from 'react'

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

const TONES: Record<Tone, string> = {
  primary:
    'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  accent:
    'bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300',
  success:
    'bg-success-50 text-success-700 dark:bg-success-700/20 dark:text-success-300',
  warning:
    'bg-warning-50 text-warning-700 dark:bg-warning-700/20 dark:text-warning-300',
  danger:
    'bg-danger-50 text-danger-700 dark:bg-danger-700/20 dark:text-danger-300',
  neutral:
    'bg-neutral-100 text-neutral-600 dark:bg-dark-elevated dark:text-dark-muted',
}

export interface BadgeProps {
  tone?: Tone
  children?: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
