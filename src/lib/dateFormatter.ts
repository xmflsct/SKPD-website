/**
 * Format a date string in Dutch locale
 * @param dateString - ISO date string (e.g., "2025-01-15")
 * @returns Formatted date string (e.g., "15 januari 2025")
 */
const dutchDateFormatter = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

const dutchDateFormatterNoYear = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long'
})

export function formatDateDutch(dateString: string): string {
  const date = new Date(dateString)
  // Check for invalid date to match toLocaleDateString behavior (which returns "Invalid Date" instead of throwing)
  if (isNaN(date.getTime())) {
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }
  return dutchDateFormatter.format(date)
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
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return `${formatDateDutch(startDate)} - ${formatDateDutch(endDate)}`
  }

  // If same year, omit year from start date
  if (start.getFullYear() === end.getFullYear()) {
    // If same month too, just show "15 - 20 januari 2025"
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${dutchDateFormatter.format(end)}`
    }
    // Different months: "15 januari - 20 maart 2025"
    return `${dutchDateFormatterNoYear.format(start)} - ${dutchDateFormatter.format(end)}`
  }
  
  // Different years: full format for both
  return `${formatDateDutch(startDate)} - ${formatDateDutch(endDate)}`
}
