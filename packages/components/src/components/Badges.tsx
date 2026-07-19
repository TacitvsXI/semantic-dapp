import type { Audience, Evidence, RiskLevel } from '@semantic-dapp/spec';
import { confidenceTier } from '@semantic-dapp/spec';

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const tier = confidenceTier(confidence);
  const pct = Math.round(confidence * 100);
  return (
    <span
      className={`sd-badge sd-badge--confidence sd-badge--conf-${tier}`}
      title={`Tier: ${tier}`}
    >
      {pct}% confidence
    </span>
  );
}

export function RiskBadge({ level, reason }: { level: RiskLevel; reason?: string }) {
  return (
    <span className={`sd-badge sd-badge--risk sd-badge--risk-${level}`} title={reason}>
      {level} risk
    </span>
  );
}

export function AudienceBadge({ audience }: { audience: Audience }) {
  return (
    <span className={`sd-badge sd-badge--audience sd-badge--audience-${audience}`}>{audience}</span>
  );
}

export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <details className="sd-evidence">
      <summary>Why? ({evidence.length} evidence)</summary>
      <ul>
        {evidence.map((item, index) => (
          <li key={index}>
            <span className="sd-evidence__source">{item.source}</span>
            <span className="sd-evidence__detail">{item.detail}</span>
            {item.weight !== undefined ? (
              <span className="sd-evidence__weight">
                {item.weight >= 0 ? `+${item.weight}` : item.weight}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
