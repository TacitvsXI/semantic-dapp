import type { OperationDefinition, RiskLevel } from '@semantic-dapp/spec';
import {
  matchDoc,
  privilegeFromModifiers,
  type SourceDocs,
  type FunctionDoc,
} from '@semantic-dapp/analyzer';

const RISK_ORDER: RiskLevel[] = ['none', 'low', 'medium', 'high', 'critical'];

function atLeast(current: RiskLevel | undefined, floor: RiskLevel): RiskLevel {
  const a = RISK_ORDER.indexOf(current ?? 'none');
  const b = RISK_ORDER.indexOf(floor);
  return RISK_ORDER[Math.max(a, b)] ?? floor;
}

function argTypesOf(signature: string): string[] {
  const inner = signature.slice(signature.indexOf('(') + 1, signature.lastIndexOf(')'));
  return inner ? inner.split(',').map((t) => t.trim()) : [];
}

/**
 * Enrich classified operations with author-written NatSpec and modifier evidence.
 *
 * Two principles keep this safe and non-overfitting:
 *  - **Additive human text.** `@notice`/`@param` become descriptions and input
 *    labels; they never change routing on their own.
 *  - **Privilege is only ever upgraded, never downgraded.** A real access modifier
 *    (`onlyOwner`/`onlyRole(...)`) is strong, author-provided proof that a write is
 *    privileged, so a `user` verdict is promoted to `admin` with a concrete
 *    permission. The absence of a modifier proves nothing, so we never demote.
 *
 * Everything is best-effort: if a function has no matching doc, it is returned
 * unchanged.
 */
export function enrichOperations(
  operations: OperationDefinition[],
  docs: SourceDocs | undefined,
): OperationDefinition[] {
  if (!docs || Object.keys(docs).length === 0) return operations;

  return operations.map((op) => {
    const name = op.function.slice(0, op.function.indexOf('('));
    // Guard against prototype keys when `docs` came back from JSON.parse.
    const candidates = Object.prototype.hasOwnProperty.call(docs, name) ? docs[name] : undefined;
    const doc = matchDoc(candidates, argTypesOf(op.function));
    if (!doc) return op;
    return enrichOne(op, doc);
  });
}

function enrichOne(op: OperationDefinition, doc: FunctionDoc): OperationDefinition {
  const next: OperationDefinition = { ...op, evidence: [...op.evidence], inputs: [...op.inputs] };

  // 1. Human description from @notice (fallback to @dev). Authoritative text.
  const text = doc.notice ?? doc.dev;
  if (text && !next.description) {
    next.description = text;
    next.evidence.push({ source: 'natspec', detail: `@notice: "${text}"`, weight: 0.1 });
  }

  // 2. Per-input labels from @param.
  if (doc.params) {
    next.inputs = next.inputs.map((input) => {
      const desc = doc.params?.[input.name];
      return desc && !input.description ? { ...input, description: desc } : input;
    });
  }

  // 3. Access modifiers -> privilege upgrade (writes only).
  if (!next.isRead) {
    const priv = privilegeFromModifiers(doc.modifiers);
    if (priv) {
      const wasUser = next.audience === 'user' || next.audience === 'developer';
      if (wasUser) next.audience = 'admin';

      if (priv.role) {
        next.permission = { kind: 'access-control', role: priv.role };
      } else if (priv.ownable) {
        next.permission = { kind: 'ownable' };
      } else if (!next.permission) {
        next.permission = { kind: 'custom' };
      }

      next.risk = {
        level: atLeast(next.risk?.level, 'medium'),
        ...(next.risk?.reason ? { reason: next.risk.reason } : {}),
      };
      next.confidence = Math.max(next.confidence, 0.8);
      next.evidence.push({
        source: 'modifier',
        detail: priv.role
          ? `gated by onlyRole(${priv.role})`
          : `gated by ${priv.modifier} - a privileged modifier`,
        weight: 0.3,
      });
    }
  }

  return next;
}
