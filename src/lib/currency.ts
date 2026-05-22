const rupiahNumberFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

/**
 * Format angka menjadi Rupiah Indonesia tanpa desimal.
 */
export function formatCurrency(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0

  return `Rp${rupiahNumberFormatter.format(Math.round(safeValue))}`
}
