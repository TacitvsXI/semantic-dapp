import type {
  ContractFunction,
  Evidence,
  InputDefinition,
  OperationDefinition,
} from '@semantic-dapp/spec';
import { inputWidgetForType, operationId } from '@semantic-dapp/spec';
import { erc20Semantic, type StandardDetection } from '@semantic-dapp/analyzer';

/** Confidence assigned to an unmatched function (raw fallback). */
export const RAW_FALLBACK_CONFIDENCE = 0.2;

function buildInputs(func: ContractFunction, operationType: string): InputDefinition[] {
  return func.inputs.map((param) => {
    const base: InputDefinition = {
      name: param.name,
      type: param.type,
      widget: inputWidgetForType(param),
    };
    // Refine amount inputs for token operations.
    if (
      (operationType === 'token-transfer' ||
        operationType === 'token-approve' ||
        operationType === 'token-mint' ||
        operationType === 'token-burn') &&
      /^uint\d*$/.test(param.type)
    ) {
      return { ...base, widget: 'token-amount', token: 'self' };
    }
    return base;
  });
}

/**
 * Classify a single function into a semantic operation. If a known rule matches
 * (currently ERC-20), it is routed by audience/type with the standard's
 * confidence. Otherwise it falls back to the Raw/Developer view (ADR-001) — it
 * is never dropped.
 */
export function classifyFunction(
  func: ContractFunction,
  contractId: string,
  detection?: StandardDetection,
): OperationDefinition {
  const id = operationId(contractId, func.signature);
  const semantic = detection?.detected ? erc20Semantic(func.signature) : undefined;

  if (semantic) {
    const confidence = Math.min(1, detection?.confidence ?? 0.9);
    const evidence: Evidence[] = [
      {
        source: 'signature',
        detail: `Matches ERC-20 rule for ${func.signature}`,
        weight: confidence,
      },
    ];
    const operation: OperationDefinition = {
      id,
      contract: contractId,
      function: func.signature,
      selector: func.selector,
      title: semantic.title,
      audience: semantic.audience,
      operationType: semantic.operationType,
      isRead: func.isRead,
      confidence,
      evidence,
      inputs: buildInputs(func, semantic.operationType),
      visibility: 'visible',
      reviewed: false,
    };
    if (semantic.description) operation.description = semantic.description;
    if (semantic.risk) operation.risk = { level: semantic.risk };
    return operation;
  }

  // Raw fallback: unknown function. Kept out of semantic tabs but always
  // reachable in the Raw tab (nothing is lost — ADR-001).
  const confidence = func.isRead ? 0.3 : RAW_FALLBACK_CONFIDENCE;
  return {
    id,
    contract: contractId,
    function: func.signature,
    selector: func.selector,
    title: func.name,
    audience: 'developer',
    operationType: func.isRead ? 'read' : 'unknown',
    isRead: func.isRead,
    confidence,
    evidence: [
      {
        source: 'name',
        detail: 'No deterministic rule matched; available in the Raw tab.',
      },
    ],
    inputs: buildInputs(func, 'unknown'),
    visibility: 'raw-only',
    reviewed: false,
  };
}
