import { useState, useEffect } from 'react'

interface BarDatum {
  label: string
  value: number
}

interface VerticalBarChartProps {
  data: BarDatum[]
  formatValue?: (v: number) => string
  height?: number
  barColor?: string
  valueTextColor?: string
  axisTextColor?: string
  emptyText?: string
}

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

export function VerticalBarChart({
  data,
  formatValue,
  height = 160,
  barColor,
  valueTextColor,
  axisTextColor,
  emptyText = 'Belum ada data',
}: VerticalBarChartProps) {
  const isDark = useIsDark()

  const resolvedBarColor = barColor ?? (isDark ? '#3b82f6' : '#1e3a8a')
  const resolvedValueColor = valueTextColor ?? (isDark ? '#cbd5e1' : '#475569')
  const resolvedAxisColor = axisTextColor ?? (isDark ? '#64748b' : '#94a3b8')

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-neutral-400 dark:text-dark-muted" style={{ height }}>
        {emptyText}
      </div>
    )
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const VB_W = 300
  const VB_H = height
  const padL = 4
  const padR = 4
  const padTop = 22
  const padBot = 24
  const chartH = VB_H - padTop - padBot
  const barW = (VB_W - padL - padR) / data.length
  const gap = Math.max(2, barW * 0.25)
  const bW = Math.max(2, barW - gap)

  const fmt = formatValue ?? ((v: number) => String(v))

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full"
      style={{ height, display: 'block' }}
      aria-hidden
    >
      {data.map((d, i) => {
        const bH = Math.max(2, (d.value / maxVal) * chartH)
        const x = padL + i * barW + gap / 2
        const y = padTop + chartH - bH
        return (
          <g key={i}>
            <rect x={x} y={y} width={bW} height={bH} rx={2} fill={resolvedBarColor} opacity={0.85} />
            {d.value > 0 && (
              <text
                x={x + bW / 2}
                y={y - 3}
                textAnchor="middle"
                fontSize={7}
                fill={resolvedValueColor}
                fontFamily="system-ui, sans-serif"
              >
                {fmt(d.value)}
              </text>
            )}
            <text
              x={x + bW / 2}
              y={VB_H - 6}
              textAnchor="middle"
              fontSize={7}
              fill={resolvedAxisColor}
              fontFamily="system-ui, sans-serif"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
