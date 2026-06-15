import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

const BASE =
  'rounded-2xl border border-neutral-200/80 bg-white shadow-soft dark:border-dark-border dark:bg-dark-card'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  /** Padding internal default. Set false untuk kontrol manual. */
  padded?: boolean
}

export function Card({ children, padded = true, className = '', ...rest }: CardProps) {
  return (
    <div className={`${BASE} ${padded ? 'p-4' : ''} ${className}`} {...rest}>
      {children}
    </div>
  )
}

export interface CardLinkProps {
  to: string
  children?: ReactNode
  className?: string
  padded?: boolean
}

/** Kartu yang dapat diklik (navigasi). */
export function CardLink({ to, children, className = '', padded = true }: CardLinkProps) {
  return (
    <Link
      to={to}
      className={`block ${BASE} transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card active:scale-[0.99] ${padded ? 'p-4' : ''} ${className}`}
    >
      {children}
    </Link>
  )
}

export default Card
