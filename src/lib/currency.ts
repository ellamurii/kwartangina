/**
 * Currency configuration and utilities
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCY_MAP: Record<string, CurrencyInfo> = {
  'PHP': { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  'CNY': { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  'USD': { code: 'USD', symbol: '$', name: 'US Dollar' },
  'EUR': { code: 'EUR', symbol: '€', name: 'Euro' },
  'GBP': { code: 'GBP', symbol: '£', name: 'British Pound' },
  'JPY': { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  'INR': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  'AUD': { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  'CAD': { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  'MXN': { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  'BRL': { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  'KRW': { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  'THB': { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  'SGD': { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  'HKD': { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
};

// Default currency: Philippine Peso
export const DEFAULT_CURRENCY = 'PHP';

/**
 * Get currency information by code
 * Defaults to PHP if not found or not provided
 */
export function getCurrencyInfo(currencyCode: string | null | undefined): CurrencyInfo {
  if (!currencyCode) {
    return CURRENCY_MAP[DEFAULT_CURRENCY];
  }
  return CURRENCY_MAP[currencyCode.toUpperCase()] || CURRENCY_MAP[DEFAULT_CURRENCY];
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, currencyCode: string | null | undefined): string {
  const currency = getCurrencyInfo(currencyCode);
  return `${currency.symbol}${Math.abs(amount).toFixed(2)}`;
}

/**
 * Get all available currencies for selection
 */
export function getAvailableCurrencies(): CurrencyInfo[] {
  return Object.values(CURRENCY_MAP);
}
