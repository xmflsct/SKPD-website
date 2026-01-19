/**
 * Format a date string in Dutch locale
 * @param dateString - ISO date string (e.g., "2025-01-15")
 * @returns Formatted date string (e.g., "15 januari 2025")
 */
export function formatDateDutch(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Format a date range in Dutch locale
 * @param startDate - ISO date string for start date
 * @param endDate - ISO date string for end date
 * @returns Formatted date range string
 */
export function formatDateRangeDutch(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // If same year, omit year from start date
  if (start.getFullYear() === end.getFullYear()) {
    // If same month too, just show "15 - 20 januari 2025"
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`
    }
    // Different months: "15 januari - 20 maart 2025"
    return `${start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`
  }
  
  // Different years: full format for both
  return `${formatDateDutch(startDate)} - ${formatDateDutch(endDate)}`
}
