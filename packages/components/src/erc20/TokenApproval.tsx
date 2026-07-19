import { useState } from 'react';
import { isAddress, getAddress } from 'viem';
import { parseTokenAmount, MAX_UINT256 } from './amount.js';

export interface TokenApprovalProps {
  decimals: number;
  symbol?: string;
  busy?: boolean;
  /** Called with the spender and allowance amount in base units. */
  onApprove: (spender: `0x${string}`, amount: bigint) => void;
}

/**
 * Semantic ERC-20 approval form. Includes an explicit "unlimited" toggle with a
 * warning, since infinite approvals are a common risk.
 */
export function TokenApproval({ decimals, symbol, busy, onApprove }: TokenApprovalProps) {
  const [spender, setSpender] = useState('');
  const [amount, setAmount] = useState('');
  const [unlimited, setUnlimited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isAddress(spender.trim())) {
      setError('Enter a valid spender address.');
      return;
    }
    let value: bigint;
    if (unlimited) {
      value = MAX_UINT256;
    } else {
      const parsed = parseTokenAmount(amount, decimals);
      if (!parsed.ok || parsed.value === undefined) {
        setError(parsed.error ?? 'Invalid amount.');
        return;
      }
      value = parsed.value;
    }
    onApprove(getAddress(spender.trim()), value);
  };

  return (
    <form className="sd-token-form" onSubmit={submit}>
      <label className="sd-field">
        <span className="sd-field__name">Spender</span>
        <input
          className="sd-input"
          value={spender}
          onChange={(e) => setSpender(e.target.value)}
          placeholder="0x…"
        />
      </label>
      <label className="sd-field">
        <span className="sd-field__name">Amount {symbol ? `(${symbol})` : ''}</span>
        <input
          className="sd-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          inputMode="decimal"
          disabled={unlimited}
        />
      </label>
      <label className="sd-bool sd-token-form__unlimited">
        <input
          type="checkbox"
          checked={unlimited}
          onChange={(e) => setUnlimited(e.target.checked)}
        />
        <span>Unlimited approval (higher risk)</span>
      </label>
      {error ? <p className="sd-field__error">{error}</p> : null}
      <button type="submit" className="sd-btn sd-btn--write" disabled={busy}>
        {busy ? 'Working…' : 'Approve'}
      </button>
    </form>
  );
}
