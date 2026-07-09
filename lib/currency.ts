export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "INR" | "MXN" | "SGD" | "PHP";

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
  /** Units of this currency per 1 USD. Static, illustrative rates — not live. */
  perUSD: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", symbol: "$", label: "US Dollar", perUSD: 1 },
  { code: "EUR", symbol: "€", label: "Euro", perUSD: 0.92 },
  { code: "GBP", symbol: "£", label: "British Pound", perUSD: 0.79 },
  { code: "JPY", symbol: "¥", label: "Japanese Yen", perUSD: 149.5 },
  { code: "AUD", symbol: "A$", label: "Australian Dollar", perUSD: 1.53 },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar", perUSD: 1.37 },
  { code: "INR", symbol: "₹", label: "Indian Rupee", perUSD: 83.4 },
  { code: "MXN", symbol: "MX$", label: "Mexican Peso", perUSD: 17.1 },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar", perUSD: 1.34 },
  { code: "PHP", symbol: "₱", label: "Philippine Peso", perUSD: 56.5 },
];

const RATE_BY_CODE: Record<CurrencyCode, number> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.perUSD]),
) as Record<CurrencyCode, number>;

export function fromUSD(amountUSD: number, currency: CurrencyCode): number {
  return amountUSD * RATE_BY_CODE[currency];
}

export function toUSD(amount: number, currency: CurrencyCode): number {
  return amount / RATE_BY_CODE[currency];
}

export function currencySymbol(currency: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$";
}
