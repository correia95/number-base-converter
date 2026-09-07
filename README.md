# number-base-converter

Binary / octal / decimal / hex, all linked: type in any field and the others
update live. A clickable bit grid lets you flip individual bits. Pick a width
(8 / 16 / 32 / 64) to read the value as a signed two's-complement integer and see
the byte breakdown. Arbitrary precision via BigInt. Value and width in the URL.

**Live:** https://number-base-converter.correia95.workers.dev/

## Stack

- React 18 + TypeScript + Vite, no runtime deps beyond React
- Static-assets Cloudflare Worker

## Engine

[`src/base.ts`](src/base.ts): `parseInBase(str, base)` (validates digits,
tolerates 0x/0b/0o), `toBase(bigint, base)`, `group`, `bits` / `fromBits`,
`signedValue`, `fitsUnsigned`, `toBytes` — all BigInt.

Verified in Node: 255 → 11111111 / 377 / FF; `0xFF` and `ff` parse to 255n;
`1092` base 8 rejected; `11111111` at 8-bit signed = −1; 30-digit decimal round-trips to hex.

## Develop / deploy

```bash
npm install
npm run dev
npm run deploy
```
