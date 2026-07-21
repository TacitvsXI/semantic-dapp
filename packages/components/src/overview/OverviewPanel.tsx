import { SafeText } from '../components/SafeText.js';
import { AddressView } from '../components/AddressView.js';

export interface OverviewPanelProps {
  contractName?: string;
  address?: string;
  chainId?: number;
  standards: string[];
  /** Number of operations per audience section, for a quick shape summary. */
  sectionCounts?: { label: string; count: number }[];
  /** Average classification confidence across semantic operations, 0..1. */
  averageConfidence?: number;
  /** Block-explorer base URL, so the address links out and can be copied. */
  explorerUrl?: string;
  wallet?: { connected: boolean; address?: string; chainId?: number };
}

const STANDARD_LABELS: Record<string, string> = {
  'erc-20': 'ERC-20',
  'erc-721': 'ERC-721',
  'erc-1155': 'ERC-1155',
  'erc-4626': 'ERC-4626 Vault',
  ownable: 'Ownable',
  'access-control': 'AccessControl',
  pausable: 'Pausable',
  upgradeable: 'Upgradeable',
};

/** A summary header for a generated app: identity, standards and network. */
export function OverviewPanel({
  contractName,
  address,
  chainId,
  standards,
  sectionCounts,
  averageConfidence,
  explorerUrl,
  wallet,
}: OverviewPanelProps) {
  const wrongNetwork =
    wallet?.connected && wallet.chainId !== undefined && chainId !== undefined
      ? wallet.chainId !== chainId
      : false;

  return (
    <section className="sd-card sd-overview">
      <header className="sd-card__header">
        <div>
          <h3 className="sd-card__title">
            <SafeText value={contractName} fallback="Contract" maxLength={80} />
          </h3>
          {address ? (
            <AddressView
              className="sd-overview__address"
              address={address}
              {...(explorerUrl ? { explorerUrl } : {})}
            />
          ) : null}
        </div>
        {chainId !== undefined ? (
          <span className="sd-badge sd-overview__chain">chain {chainId}</span>
        ) : null}
      </header>

      {standards.length > 0 ? (
        <div className="sd-overview__chips">
          {standards.map((s) => (
            <span key={s} className="sd-chip">
              {STANDARD_LABELS[s] ?? s}
            </span>
          ))}
        </div>
      ) : (
        <p className="sd-card__desc">No known standards detected — raw ABI only.</p>
      )}

      <div className="sd-overview__meta">
        {sectionCounts?.map((s) => (
          <div key={s.label} className="sd-overview__stat">
            <span className="sd-overview__stat-value">{s.count}</span>
            <span className="sd-overview__stat-label">{s.label}</span>
          </div>
        ))}
        {averageConfidence !== undefined ? (
          <div className="sd-overview__stat">
            <span className="sd-overview__stat-value">{Math.round(averageConfidence * 100)}%</span>
            <span className="sd-overview__stat-label">avg confidence</span>
          </div>
        ) : null}
      </div>

      {wrongNetwork ? (
        <p className="sd-overview__warn">
          Wallet is on chain {wallet?.chainId}, but this contract is on chain {chainId}.
        </p>
      ) : null}
    </section>
  );
}
