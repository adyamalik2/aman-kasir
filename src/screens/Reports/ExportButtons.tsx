import type { ReactNode } from 'react'

interface ExportButtonsProps {
  children: ReactNode
}

export default function ExportButtons({ children }: ExportButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-neutral-100 pb-3">
      {children}
    </div>
  )
}

export function ExportButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-neutral-200 bg-surface px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
    >
      {label}
    </button>
  )
}
