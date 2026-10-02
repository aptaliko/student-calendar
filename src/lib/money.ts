export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD'] as const;

const SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', CAD: 'CA$', AUD: 'A$' };

export const currencySymbol = (currency: string) => SYMBOLS[currency] ?? currency;

/** Greek number formatting by hand (1.234,50) — Intl output differs between Node and browsers. */
function greekNumber(value: number, decimals: number): string {
  const [int, frac] = Math.abs(value).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '−' : ''}${grouped}${frac ? `,${frac}` : ''}`;
}

/** '1.234,50 €' (compact drops ',00' on whole amounts). */
export function formatMoney(cents: number, currency: string, opts: { compact?: boolean } = {}): string {
  const decimals = opts.compact && cents % 100 === 0 ? 0 : 2;
  return `${greekNumber(cents / 100, decimals)} ${SYMBOLS[currency] ?? currency}`;
}

/** Lesson price from an hourly rate, rounded to whole cents. */
export function priceFor(hourlyRateCents: number, durationMinutes: number): number {
  return Math.round((hourlyRateCents * durationMinutes) / 60);
}

/** '25' / '25.5' / '25,50' → cents; null when not a valid non-negative amount. */
export function parseMoney(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** '1,5 ώρ.' */
export function formatHours(minutes: number): string {
  const h = minutes / 60;
  return `${greekNumber(h, Number.isInteger(h) ? 0 : 1)} ώρ.`;
}
