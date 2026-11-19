/** Four decimal places, as used by the 1998B numeric/currency fields. */
export const DECIMAL_SCALE = 10_000n;

/** Parse without binary floating point, coercion, trimming or exponent notation. */
export function parseDecimal(value: string): bigint | null {
  if (!/^[+-]?(?:\d+(?:\.\d{0,4})?|\.\d{1,4})$/.test(value)) return null;
  const unsigned = value.replace(/^[+-]/, '');
  const [whole = '', fraction = ''] = unsigned.split('.');
  const scaled = BigInt(whole || '0') * DECIMAL_SCALE + BigInt(fraction.padEnd(4, '0'));
  return value.startsWith('-') ? -scaled : scaled;
}

/** A canonical decimal string, never scientific notation. */
export function formatDecimal(value: bigint, places: 4 | 8 = 4): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(places + 1, '0');
  const fraction = digits.slice(-places).replace(/0+$/, '');
  return (negative ? '-' : '') + digits.slice(0, -places) + (fraction ? '.' + fraction : '');
}
