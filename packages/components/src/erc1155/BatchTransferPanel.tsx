import { useState } from 'react';
import { isAddress, getAddress } from 'viem';
import { AddressView } from '../components/AddressView.js';

interface Row {
  id: string;
  amount: string;
}

export interface BatchTransferPanelProps {
  /** Connected account the tokens are sent from. */
  from?: string;
  explorerUrl?: string;
  busy?: boolean;
  /** Called with the recipient and index-aligned id/amount arrays (base units). */
  onTransfer: (to: `0x${string}`, ids: bigint[], amounts: bigint[]) => void;
}

function parseUint(raw: string): bigint | null {
  const t = raw.trim();
  if (t === '' || !/^\d+$/.test(t)) return null;
  try {
    return BigInt(t);
  } catch {
    return null;
  }
}

/**
 * Semantic ERC-1155 batch transfer builder: paired (token id, amount) rows kept
 * index-aligned for you, instead of two disconnected `uint256[]` array inputs.
 * Encodes to `safeBatchTransferFrom(from, to, ids, amounts, "0x")`.
 */
export function BatchTransferPanel({
  from,
  explorerUrl,
  busy,
  onTransfer,
}: BatchTransferPanelProps) {
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<Row[]>([{ id: '', amount: '' }]);
  const [error, setError] = useState<string | null>(null);

  const setRow = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { id: '', amount: '' }]);
  const removeRow = (index: number) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isAddress(to.trim())) {
      setError('Enter a valid recipient address.');
      return;
    }
    const ids: bigint[] = [];
    const amounts: bigint[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      const id = parseUint(rows[i]!.id);
      const amount = parseUint(rows[i]!.amount);
      if (id === null) {
        setError(`Row ${i + 1}: invalid token id.`);
        return;
      }
      if (amount === null) {
        setError(`Row ${i + 1}: invalid amount.`);
        return;
      }
      ids.push(id);
      amounts.push(amount);
    }
    onTransfer(getAddress(to.trim()), ids, amounts);
  };

  return (
    <section className="sd-card sd-batch">
      <header className="sd-card__header">
        <div>
          <h3 className="sd-card__title">Batch transfer</h3>
          <code className="sd-card__sig">safeBatchTransferFrom</code>
        </div>
        <span className="sd-badge sd-chip">ERC-1155</span>
      </header>

      {from ? (
        <p className="sd-batch__from">
          From <AddressView address={from} {...(explorerUrl ? { explorerUrl } : {})} />
        </p>
      ) : null}

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

        <div className="sd-batch__rows">
          <div className="sd-batch__head">
            <span>Token id</span>
            <span>Amount</span>
            <span />
          </div>
          {rows.map((row, index) => (
            <div className="sd-batch__row" key={index}>
              <input
                className="sd-input"
                inputMode="numeric"
                placeholder="id"
                value={row.id}
                onChange={(e) => setRow(index, { id: e.target.value })}
              />
              <input
                className="sd-input"
                inputMode="numeric"
                placeholder="amount"
                value={row.amount}
                onChange={(e) => setRow(index, { amount: e.target.value })}
              />
              <button
                type="button"
                className="sd-btn sd-btn--ghost"
                onClick={() => removeRow(index)}
                disabled={rows.length === 1}
                aria-label={`Remove row ${index + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="sd-btn sd-btn--ghost" onClick={addRow}>
            + Add token
          </button>
        </div>

        {error ? <p className="sd-field__error">{error}</p> : null}

        <button type="submit" className="sd-btn sd-btn--write" disabled={busy}>
          {busy ? 'Working…' : `Transfer ${rows.length} token${rows.length === 1 ? '' : 's'}`}
        </button>
      </form>
    </section>
  );
}
