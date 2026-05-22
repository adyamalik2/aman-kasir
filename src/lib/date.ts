const readableDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * Format tanggal menjadi teks yang mudah dibaca untuk UI Indonesia.
 */
export function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return readableDateFormatter.format(date)
}
