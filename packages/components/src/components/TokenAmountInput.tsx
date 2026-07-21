import { useEffect, useRef, useState } from 'react';
import type { FieldValue } from '../inputs/types.js';
import { displayTokenAmount, parseTokenAmount } from '../erc20/amount.js';

export interface TokenAmountInputProps {
  /** Controlled value in base units (what the ABI encoder consumes). */
  value: string;
  onChange: (value: FieldValue) => void;
  decimals: number;
  symbol?: string;
  /** Connected balance in base units, used for the MAX shortcut. */
  balance?: bigint;
}

function safeFormat(base: string, decimals: number): string {
  try {
    return displayTokenAmount(BigInt(base), decimals);
  } catch {
    return '';
  }
}

/**
 * A decimals-aware amount input: the user types human units (e.g. `1.5`) while
 * the field emits base units (`1500000000000000000`) for encoding. Offers MAX
 * from the connected balance and echoes the resolved base-unit value.
 */
export function TokenAmountInput({
  value,
  onChange,
  decimals,
  symbol,
  balance,
}: TokenAmountInputProps) {
  const [display, setDisplay] = useState<string>(() => (value ? safeFormat(value, decimals) : ''));
  // The last base-units string we emitted; lets us tell our own edits apart
  // from an external change (form reset, prefilled value) and resync only then.
  const lastEmitted = useRef<string>(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setDisplay(value ? safeFormat(value, decimals) : '');
      lastEmitted.current = value;
    }
  }, [value, decimals]);

  const handle = (raw: string) => {
    setDisplay(raw);
    const parsed = parseTokenAmount(raw, decimals);
    const emit = parsed.ok && parsed.value !== undefined ? parsed.value.toString() : '';
    lastEmitted.current = emit;
    onChange(emit);
  };

  const trimmed = display.trim();
  const parsed = trimmed === '' ? null : parseTokenAmount(display, decimals);

  return (
    <>
      <div className="sd-amount">
        <input
          className="sd-input"
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={display}
          aria-invalid={parsed && !parsed.ok ? true : undefined}
          onChange={(e) => handle(e.target.value)}
        />
        {balance !== undefined ? (
          <button
            type="button"
            className="sd-btn sd-btn--ghost sd-amount__max"
            onClick={() => handle(displayTokenAmount(balance, decimals))}
          >
            max
          </button>
        ) : null}
      </div>
      {parsed && !parsed.ok ? (
        <p className="sd-field__warn">{parsed.error}</p>
      ) : parsed && parsed.ok && parsed.value !== undefined ? (
        <p className="sd-field__hint">
          = {parsed.value.toString()} base units
          {symbol ? ` · ${symbol}` : ''}
          {balance !== undefined ? ` · balance ${displayTokenAmount(balance, decimals)}` : ''}
        </p>
      ) : balance !== undefined ? (
        <p className="sd-field__hint">
          Balance {displayTokenAmount(balance, decimals)}
          {symbol ? ` ${symbol}` : ''}
        </p>
      ) : null}
    </>
  );
}
