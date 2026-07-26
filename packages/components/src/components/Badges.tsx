import type { Audience, Evidence, Permission, RiskLevel } from '@semantic-dapp/spec';
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

/** Short human label for how an operation is gated on-chain. */
function permissionLabel(permission: Permission): string {
  switch (permission.kind) {
    case 'ownable':
      return 'owner only';
    case 'access-control':
      return permission.role ? `role: ${permission.role}` : 'role-gated';
    case 'custom':
      return 'restricted';
    default:
      return 'permissioned';
  }
}

/**
 * Shows how a privileged operation is gated (owner / role / custom) so custody
 * operators can trust the admin label. `detail` (e.g. "restricted to owner",
 * "requires MINTER_ROLE") is surfaced as a tooltip when available.
 */
export function PermissionBadge({
  permission,
  detail,
}: {
  permission: Permission;
  detail?: string;
}) {
  if (permission.kind === 'none') return null;
  return (
    <span
      className={`sd-badge sd-badge--permission sd-badge--permission-${permission.kind}`}
      title={detail ?? `Gated by ${permission.kind}`}
    >
      🔒 {permissionLabel(permission)}
    </span>
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
