// Number base conversion with BigInt. Non-negative values; also shows the
// two's-complement bit pattern at a chosen width.

export type Base = 2 | 8 | 10 | 16;

export const BASE_NAME: Record<Base, string> = {
  2: 'Binary',
  8: 'Octal',
  10: 'Decimal',
  16: 'Hex',
};
export const BASE_PREFIX: Record<Base, string> = { 2: '0b', 8: '0o', 10: '', 16: '0x' };

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

export function parseInBase(input: string, base: Base): bigint | null {
  let s = input.trim().toLowerCase().replace(/[_\s]/g, '');
  if (s === '') return null;
  // tolerate a leading prefix that matches the base
  if (base === 16 && s.startsWith('0x')) s = s.slice(2);
  else if (base === 2 && s.startsWith('0b')) s = s.slice(2);
  else if (base === 8 && s.startsWith('0o')) s = s.slice(2);
  if (s === '') return null;
  let value = 0n;
  const b = BigInt(base);
  for (const ch of s) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return null;
    value = value * b + BigInt(d);
  }
  return value;
}

export function toBase(value: bigint, base: Base): string {
  if (value === 0n) return '0';
  const b = BigInt(base);
  let v = value;
  let out = '';
  while (v > 0n) {
    out = DIGITS[Number(v % b)] + out;
    v /= b;
  }
  return base === 16 ? out.toUpperCase() : out;
}

// group digits for readability: binary/hex in 4s, decimal in 3s, octal in 3s
export function group(s: string, base: Base): string {
  const size = base === 10 ? 3 : base === 2 ? 4 : base === 16 ? 4 : 3;
  const sep = base === 10 ? ',' : ' ';
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % size === 0) out += sep;
    out += s[i];
  }
  return out;
}

export const WIDTHS = [8, 16, 32, 64] as const;
export type Width = (typeof WIDTHS)[number];

export function fitsUnsigned(value: bigint, width: Width): boolean {
  return value >= 0n && value < 1n << BigInt(width);
}

// bit array MSB-first at the given width (value masked to width)
export function bits(value: bigint, width: Width): number[] {
  const mask = (1n << BigInt(width)) - 1n;
  const v = value & mask;
  const arr: number[] = [];
  for (let i = width - 1; i >= 0; i--) arr.push(Number((v >> BigInt(i)) & 1n));
  return arr;
}

export function fromBits(arr: number[]): bigint {
  let v = 0n;
  for (const bit of arr) v = (v << 1n) | (bit ? 1n : 0n);
  return v;
}

// interpret the width-bit pattern as a signed two's-complement number
export function signedValue(value: bigint, width: Width): bigint {
  const mask = (1n << BigInt(width)) - 1n;
  const v = value & mask;
  const signBit = 1n << BigInt(width - 1);
  return v >= signBit ? v - (1n << BigInt(width)) : v;
}

export function toBytes(value: bigint, width: Width): string {
  const b = bits(value, width);
  const bytes: string[] = [];
  for (let i = 0; i < b.length; i += 8) {
    bytes.push(b.slice(i, i + 8).join(''));
  }
  return bytes.join(' ');
}
