import { displayTokenAmount } from './amount.js';

export interface TokenDashboardProps {
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: bigint;
  connectedBalance?: bigint;
  loading?: boolean;
}

/** Read-only dashboard of ERC-20 metadata. */
export function TokenDashboard({
  name,
  symbol,
  decimals,
  totalSupply,
  connectedBalance,
  loading,
}: TokenDashboardProps) {
  const dp = decimals ?? 18;
  return (
    <section className="sd-card sd-token-dashboard">
      <header className="sd-card__header">
        <div>
          <h3 className="sd-card__title">{name ?? 'Token'}</h3>
          {symbol ? <code className="sd-card__sig">{symbol}</code> : null}
        </div>
      </header>
      {loading ? <p className="sd-empty">Loading metadata…</p> : null}
      <dl className="sd-token-dashboard__grid">
        <div>
          <dt>Symbol</dt>
          <dd>{symbol ?? '—'}</dd>
        </div>
        <div>
          <dt>Decimals</dt>
          <dd>{decimals ?? '—'}</dd>
        </div>
        <div>
          <dt>Total supply</dt>
          <dd>{totalSupply !== undefined ? displayTokenAmount(totalSupply, dp) : '—'}</dd>
        </div>
        <div>
          <dt>Your balance</dt>
          <dd>{connectedBalance !== undefined ? displayTokenAmount(connectedBalance, dp) : '—'}</dd>
        </div>
      </dl>
    </section>
  );
}
