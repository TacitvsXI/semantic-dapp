import type { Audience, SemanticManifest, Visibility } from '@semantic-dapp/spec';

/** Manual review actions a user can take on a classified operation. */
export type ReviewAction =
  | { type: 'confirm' }
  | { type: 'set-audience'; audience: Audience }
  | { type: 'set-visibility'; visibility: Visibility }
  | { type: 'move-to-raw' }
  | { type: 'set-title'; title: string }
  | { type: 'set-description'; description: string };

/**
 * Apply a manual review action to one operation, returning a new manifest.
 * Manual edits are first-class and mark the operation as reviewed (ADR-002).
 */
export function applyReview(
  manifest: SemanticManifest,
  operationId: string,
  action: ReviewAction,
): SemanticManifest {
  const operations = manifest.operations.map((op) => {
    if (op.id !== operationId) return op;
    switch (action.type) {
      case 'confirm':
        return { ...op, reviewed: true };
      case 'set-audience':
        return { ...op, audience: action.audience, reviewed: true };
      case 'set-visibility':
        return { ...op, visibility: action.visibility, reviewed: true };
      case 'move-to-raw':
        return { ...op, visibility: 'raw-only' as const, reviewed: true };
      case 'set-title':
        return { ...op, title: action.title, reviewed: true };
      case 'set-description':
        return { ...op, description: action.description, reviewed: true };
      default:
        return op;
    }
  });
  return { ...manifest, operations };
}

/**
 * Merge a freshly-analyzed manifest with a previous one, preserving human edits.
 * Reviewed operations keep their display fields (title, description, audience,
 * visibility) while adopting refreshed technical fields (inputs, selector,
 * confidence, evidence). See ADR-002 / ADR-004.
 */
export function mergeReviewed(
  previous: SemanticManifest,
  fresh: SemanticManifest,
): SemanticManifest {
  const reviewed = new Map(
    previous.operations.filter((op) => op.reviewed).map((op) => [op.id, op]),
  );

  const operations = fresh.operations.map((op) => {
    const prior = reviewed.get(op.id);
    if (!prior) return op;
    return {
      ...op,
      title: prior.title,
      ...(prior.description !== undefined ? { description: prior.description } : {}),
      audience: prior.audience,
      visibility: prior.visibility,
      reviewed: true,
    };
  });

  return { ...fresh, operations };
}
