// Utility functions to handle dates safely without timezone offset issues

/**
 * Format a date string to local date display (dd/mm/yyyy)
 * Handles standard "YYYY-MM-DD" and robustly ignores any time data.
 */
export function formatLocalDate(dateString: string): string {
  if (!dateString) return '';
  
  // Extract just the YYYY-MM-DD part cleanly before doing any Date parsing
  const [year, month, day] = dateString.split('T')[0].split('-');
  
  // Create date locally to avoid UTC conversion shifts
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  
  return date.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Get the date value for input[type="date"] from a date string
 * Ensures we get YYYY-MM-DD format strictly.
 */
export function getInputDateValue(dateString: string): string {
  if (!dateString) return '';
  return dateString.split('T')[0];
}

/**
 * Get today's date in YYYY-MM-DD format explicitly in the user's timezone
 */
export function getTodayInputValue(): string {
  return new Date().toLocaleDateString('en-CA'); // 'en-CA' natively formats as YYYY-MM-DD
}