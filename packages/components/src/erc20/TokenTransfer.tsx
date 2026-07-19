import { useState } from 'react';
import { isAddress, getAddress } from 'viem';
import { parseTokenAmount, displayTokenAmount } from './amount.js';

export interface TokenTransferProps {
  decimals: number;
  symbol?: string;
  balance?: bigint;
  busy?: boolean;
  /** Called with the recipient and amount in base units. */
  onTransfer: (to: `0x${string}`, amount: bigint) => void;
}

/** Semantic ERC-20 transfer form (human amount → base units). */
export function TokenTransfer({ decimals, symbol, balance, busy, onTransfer }: TokenTransferProps) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isAddress(to.trim())) {
      setError('Enter a valid recipient address.');
      return;
    }
    const parsed = parseTokenAmount(amount, decimals);
    if (!parsed.ok || parsed.value === undefined) {
      setError(parsed.error ?? 'Invalid amount.');
      return;
    }
    if (balance !== undefined && parsed.value > balance) {
      setError('Amount exceeds your balance.');
      return;
    }
    onTransfer(getAddress(to.trim()), parsed.value);
  };

  return (
    <form className="sd-token-form" onSubmit={submit}>
      <label className="sd-field">
        <span className="sd-field__name">Recipient</span>
        <input
          className="sd-input"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="0x…"
        />
      </label>
      <label className="sd-field">
        <span className="sd-field__name">
          Amount {symbol ? `(${symbol})` : ''}
          {balance !== undefined ? (
            <button
              type="button"
              className="sd-btn sd-btn--ghost sd-token-form__max"
              onClick={() => setAmount(displayTokenAmount(balance, decimals))}
            >
              max
            </button>
          ) : null}
        </span>
        <input
          className="sd-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          inputMode="decimal"
        />
      </label>
      {error ? <p className="sd-field__error">{error}</p> : null}
      <button type="submit" className="sd-btn sd-btn--write" disabled={busy}>
        {busy ? 'Working…' : 'Transfer'}
      </button>
    </form>
  );
}
