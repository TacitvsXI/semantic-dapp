import type {
  Audience,
  ContractFunction,
  InputDefinition,
  OperationDefinition,
  OperationType,
  Permission,
} from '@semantic-dapp/spec';
import { inputWidgetForType, operationId } from '@semantic-dapp/spec';
import type { AccessModel } from '@semantic-dapp/analyzer';
import { runRules, type RuleContext } from './engine.js';
import { DEFAULT_RULES } from './heuristics.js';

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

  // Fungible value inputs render as token amounts (decimals-aware). Restricted to
  // standard-backed fungible ops so heuristic matches don't mislabel arbitrary ints.
  const valueOp =
    operationType === 'token-transfer' ||
    operationType === 'token-approve' ||
    operationType === 'token-mint' ||
    operationType === 'token-burn' ||
    operationType === 'vault-deposit' ||
    operationType === 'vault-withdraw';
  if (valueOp && standard !== undefined && FUNGIBLE_STANDARDS.has(standard)) {
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
  audience: Audience,
  operationType: OperationType,
  isRead: boolean,
  access: AccessModel | undefined,
): Permission | undefined {
  const privileged = !isRead && audience !== 'user' && audience !== 'developer';
  if (!privileged) return undefined;

  // Role-based operations are always AccessControl-gated by definition.
  if (operationType.startsWith('role-')) return { kind: 'access-control' };

  if (access?.kind === 'ownable') return { kind: 'ownable' };
  if (access?.kind === 'access-control') return { kind: 'access-control' };
  return { kind: 'custom' };
}

/**
 * Classify a single function into a semantic operation using the priority rule
 * engine (ADR-006). Standards win routing; heuristics fill gaps; unknown writers
 * fall back to the Raw view — nothing is ever dropped (ADR-001).
 */
export function classifyFunction(ctx: RuleContext, contractId: string): OperationDefinition {
  const { func } = ctx;
  const resolved = runRules(ctx, DEFAULT_RULES);
  const id = operationId(contractId, func.signature);

  const operation: OperationDefinition = {
    id,
    contract: contractId,
    function: func.signature,
    selector: func.selector,
    title: resolved.title,
    audience: resolved.audience,
    operationType: resolved.operationType,
    isRead: func.isRead,
    confidence: resolved.confidence,
    evidence: resolved.evidence,
    inputs: buildInputs(func, resolved.operationType, resolved.standard),
    visibility: resolved.visibility,
    reviewed: false,
  };
  if (resolved.description) operation.description = resolved.description;
  if (resolved.risk) operation.risk = { level: resolved.risk };
  const permission = permissionFor(
    resolved.audience,
    resolved.operationType,
    func.isRead,
    ctx.access,
  );
  if (permission) operation.permission = permission;
  return operation;
}
