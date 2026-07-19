import type {
  ContractFunction,
  Evidence,
  InputDefinition,
  OperationDefinition,
  Permission,
} from '@semantic-dapp/spec';
import { inputWidgetForType, operationId } from '@semantic-dapp/spec';
import type { AccessModel, FunctionSemantic, ResolvedSemantic } from '@semantic-dapp/analyzer';

/** Confidence assigned to an unmatched function (raw fallback). */
export const RAW_FALLBACK_CONFIDENCE = 0.2;

const FUNGIBLE_STANDARDS = new Set(['erc-20', 'erc-4626']);
const NFT_STANDARDS = new Set(['erc-721', 'erc-1155']);

const AMOUNT_NAME = /amount|value|assets|shares|wad/i;
const ID_NAME = /id/i;

function refineInput(
  param: ContractFunction['inputs'][number],
  operationType: string,
  standard: string | undefined,
): InputDefinition {
  const base: InputDefinition = {
    name: param.name,
    type: param.type,
    widget: inputWidgetForType(param),
  };
  if (!/^uint\d*$/.test(param.type)) return base;

  // NFT ids vs amounts are name-driven (ERC-721/1155 use uint256 for both).
  if (standard && NFT_STANDARDS.has(standard)) {
    if (ID_NAME.test(param.name)) return { ...base, widget: 'token-id' };
    if (AMOUNT_NAME.test(param.name)) return { ...base, widget: 'token-amount', token: 'self' };
    return base;
  }

  // Fungible value inputs render as token amounts (decimals-aware).
  const valueOp =
    operationType === 'token-transfer' ||
    operationType === 'token-approve' ||
    operationType === 'token-mint' ||
    operationType === 'token-burn' ||
    operationType === 'vault-deposit' ||
    operationType === 'vault-withdraw';
  if (valueOp && (standard === undefined || FUNGIBLE_STANDARDS.has(standard))) {
    return { ...base, widget: 'token-amount', token: 'self' };
  }
  return base;
}

function buildInputs(
  func: ContractFunction,
  operationType: string,
  standard?: string,
): InputDefinition[] {
  return func.inputs.map((param) => refineInput(param, operationType, standard));
}

/** Derive the on-chain permission gating a privileged operation, if any. */
function permissionFor(
  semantic: FunctionSemantic,
  access: AccessModel | undefined,
): Permission | undefined {
  const privileged =
    !semantic.isRead && semantic.audience !== 'user' && semantic.audience !== 'developer';
  if (!privileged) return undefined;

  // Role-based operations are always AccessControl-gated by definition.
  if (semantic.operationType.startsWith('role-')) return { kind: 'access-control' };

  if (access?.kind === 'ownable') return { kind: 'ownable' };
  if (access?.kind === 'access-control') return { kind: 'access-control' };
  return { kind: 'custom' };
}

/**
 * Classify a single function into a semantic operation. If a known rule matches
 * (from any detected standard), it is routed by audience/type with the standard's
 * confidence and a permission from the access model. Otherwise it falls back to
 * the Raw/Developer view (ADR-001) — it is never dropped.
 */
export function classifyFunction(
  func: ContractFunction,
  contractId: string,
  resolved?: ResolvedSemantic,
  access?: AccessModel,
): OperationDefinition {
  const id = operationId(contractId, func.signature);

  if (resolved) {
    const { semantic, standard, confidence: standardConfidence } = resolved;
    const confidence = Math.min(1, standardConfidence || 0.9);
    const evidence: Evidence[] = [
      {
        source: 'signature',
        detail: `Matches ${standard} rule for ${func.signature}`,
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
      inputs: buildInputs(func, semantic.operationType, standard),
      visibility: 'visible',
      reviewed: false,
    };
    if (semantic.description) operation.description = semantic.description;
    if (semantic.risk) operation.risk = { level: semantic.risk };
    const permission = permissionFor(semantic, access);
    if (permission) operation.permission = permission;
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
