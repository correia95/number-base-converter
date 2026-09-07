import { useEffect, useMemo, useState } from 'react';
import {
  BASE_NAME,
  Base,
  Width,
  WIDTHS,
  bits,
  fitsUnsigned,
  fromBits,
  group,
  parseInBase,
  signedValue,
  toBase,
  toBytes,
} from './base';

const BASES: Base[] = [2, 8, 10, 16];

function read(): { value: bigint; width: Width } {
  try {
    const p = new URLSearchParams(window.location.search);
    const raw = p.get('v');
    let value = 0n;
    if (raw && /^\d+$/.test(raw)) value = BigInt(raw);
    const w = Number(p.get('w'));
    const width = (WIDTHS as readonly number[]).includes(w) ? (w as Width) : 32;
    return { value, width };
  } catch {
    return { value: 0n, width: 32 };
  }
}

export default function App() {
  const init = read();
  const [value, setValue] = useState<bigint>(init.value);
  const [width, setWidth] = useState<Width>(init.width);
  const [fields, setFields] = useState<Record<Base, string>>({
    2: toBase(init.value, 2),
    8: toBase(init.value, 8),
    10: toBase(init.value, 10),
    16: toBase(init.value, 16),
  });
  const [bad, setBad] = useState<Base | null>(null);
  const [copied, setCopied] = useState(false);

  // push a new value into every field
  const spread = (v: bigint, except?: Base) => {
    setValue(v);
    setFields((f) => {
      const next = { ...f };
      for (const b of BASES) if (b !== except) next[b] = toBase(v, b);
      return next;
    });
  };

  const onEdit = (base: Base, text: string) => {
    setFields((f) => ({ ...f, [base]: text }));
    if (text.trim() === '') {
      setBad(null);
      spread(0n, base);
      return;
    }
    const parsed = parseInBase(text, base);
    if (parsed == null) {
      setBad(base);
      return;
    }
    setBad(null);
    spread(parsed, base);
  };

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('v', value.toString());
      u.searchParams.set('w', String(width));
      window.history.replaceState(null, '', u.toString());
    } catch {
      /* ignore */
    }
  }, [value, width]);

  const bitArr = useMemo(() => bits(value, width), [value, width]);
  const fits = fitsUnsigned(value, width);
  const signed = signedValue(value, width);

  const toggleBit = (idx: number) => {
    const next = [...bitArr];
    next[idx] = next[idx] ? 0 : 1;
    spread(fromBits(next));
    setBad(null);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Number Base Converter</h1>
        <p className="tag">
          Convert between binary, octal, decimal and hex. Type in any field and the others update as
          you go. Flip individual bits, and read the value as a signed two's-complement integer at
          8, 16, 32 or 64 bits.
        </p>
      </header>

      <div className="fields">
        {BASES.map((b) => (
          <label key={b} className={`f ${bad === b ? 'bad' : ''}`}>
            <span>
              {BASE_NAME[b]}
              <i>base {b}</i>
            </span>
            <input
              type="text"
              inputMode={b === 10 ? 'numeric' : 'text'}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              value={fields[b]}
              onChange={(e) => onEdit(b, e.target.value)}
            />
            {bad === b && <em>not a valid base-{b} number</em>}
          </label>
        ))}
      </div>

      <div className="grouped">
        {BASES.map((b) => (
          <div key={b}>
            <span>{BASE_NAME[b]}</span>
            <code>{group(toBase(value, b), b)}</code>
          </div>
        ))}
      </div>

      <div className="widthrow">
        <span className="lbl">Bit width</span>
        <div className="wseg">
          {WIDTHS.map((w) => (
            <button key={w} className={width === w ? 'on' : ''} onClick={() => setWidth(w)}>{w}</button>
          ))}
        </div>
        {!fits && <span className="warn">value needs more than {width} bits — the grid below is truncated</span>}
      </div>

      <div className="bitgrid" style={{ ['--cols' as string]: Math.min(width, 16) }}>
        {bitArr.map((bit, i) => {
          const posFromRight = width - 1 - i;
          return (
            <button
              key={i}
              className={`bit ${bit ? 'one' : 'zero'} ${posFromRight % 8 === 7 && posFromRight !== width - 1 ? 'byteedge' : ''}`}
              onClick={() => toggleBit(i)}
              title={`bit ${posFromRight} (value ${(1n << BigInt(posFromRight)).toString()})`}
            >
              {bit}
              <i>{posFromRight}</i>
            </button>
          );
        })}
      </div>

      <div className="readouts">
        <div><span>Unsigned</span><b>{(value & ((1n << BigInt(width)) - 1n)).toString()}</b></div>
        <div><span>Signed ({width}-bit)</span><b>{signed.toString()}</b></div>
        <div><span>Bytes</span><b className="mono">{toBytes(value, width)}</b></div>
      </div>

      <button className="share" onClick={share}>{copied ? 'Link copied' : 'Copy shareable link'}</button>

      <section className="explainer">
        <h2>Reading the bases</h2>
        <p>
          Each base writes the same value with a different set of digits. Binary (base 2) uses 0–1,
          octal (base 8) uses 0–7, decimal (base 10) uses 0–9, and hexadecimal (base 16) uses 0–9
          then A–F. Hex is popular in programming because one hex digit maps exactly to four bits, so
          a byte is always two hex digits.
        </p>
        <h3>Two's complement</h3>
        <p>
          Computers store negative integers in two's complement: the top bit is the sign, and −1 is
          "all ones". At 8 bits, <code>11111111</code> is 255 unsigned but −1 signed;
          <code>10000000</code> is 128 unsigned but −128 signed. Pick a width above to see how the
          same bit pattern reads both ways.
        </p>
        <h3>Big numbers</h3>
        <p>
          The converter uses arbitrary-precision integers, so you can paste values far larger than
          64 bits and still convert them exactly — the bit grid just shows the low bits for the
          width you chose.
        </p>
        <h3>Is anything sent to a server?</h3>
        <p>No. Everything is computed in your browser; the value and width are only stored in the page link.</p>
        <footer>Number Base Converter · no sign-up · works offline once loaded</footer>
      </section>
    </div>
  );
}
