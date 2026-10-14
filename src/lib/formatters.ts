/**
 * Format an amount in Indian Rupee format (₹)
 * Handles null, undefined, 0, and string inputs gracefully.
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0';
  }

  const num = Number(amount);
  
  // Format with standard Indian numbering system
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: num % 1 !== 0 ? 2 : 0,
  }).format(num);

  return formatted;
}

/**
 * Format a date string into readable format (e.g. 05 Oct 2026)
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Get month name by month number (1 - 12)
 */
export function getMonthName(monthIndex: number | null | undefined): string {
  if (!monthIndex || monthIndex < 1 || monthIndex > 12) return '—';
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex - 1];
}

/**
 * Expense categories list
 */
export const EXPENSE_CATEGORIES = [
  'Electricity',
  'Maid',
  'Security',
  'Cleaning',
  'Water',
  'Lift',
  'Plumbing',
  'Repair',
  'Maintenance',
  'Gardening',
  'Common Area',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/**
 * Payment methods list
 */
export const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Cheque',
  'Other',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Payment types list
 */
export const PAYMENT_TYPES = [
  'Monthly',
  'Annual',
  'Other',
] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];
