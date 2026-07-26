import type { OperationDefinition } from '@semantic-dapp/spec';

const FOT_NOTE = 'Fee-on-transfer token: the recipient may receive less than the amount you enter.';

/**
 * When a fee-on-transfer surface was detected, annotate token-transfer writers
 * with a plain-language warning. Additive: never changes audience/type/risk.
 */
export function annotateFeeOnTransfer(
  operations: OperationDefinition[],
  standards: string[],
): OperationDefinition[] {
  if (!standards.includes('fee-on-transfer')) return operations;

  return operations.map((op) => {
    if (op.isRead || op.operationType !== 'token-transfer') return op;
    const already = op.description?.includes('Fee-on-transfer') ?? false;
    if (already) return op;
    const description = op.description ? `${op.description} ${FOT_NOTE}` : FOT_NOTE;
    return {
      ...op,
      description,
      evidence: [
        ...op.evidence,
        {
          source: 'signature',
          detail: FOT_NOTE,
          weight: 0,
        },
      ],
    };
  });
}
