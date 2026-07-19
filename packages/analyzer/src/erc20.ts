import type { ContractModel, Evidence } from '@semantic-dapp/spec';
import type { FunctionSemantic, StandardDetection, StandardDetector } from './types.js';

/** ERC-20 members with their contribution to the confidence score. */
interface Erc20Member {
  signature: string;
  kind: 'function' | 'event';
  weight: number;
  /** Required for the standard (vs optional metadata). */
  required: boolean;
}

const ERC20_MEMBERS: Erc20Member[] = [
  { signature: 'totalSupply()', kind: 'function', weight: 0.1, required: true },
  { signature: 'balanceOf(address)', kind: 'function', weight: 0.15, required: true },
  { signature: 'transfer(address,uint256)', kind: 'function', weight: 0.2, required: true },
  { signature: 'allowance(address,address)', kind: 'function', weight: 0.1, required: true },
  { signature: 'approve(address,uint256)', kind: 'function', weight: 0.15, required: true },
  {
    signature: 'transferFrom(address,address,uint256)',
    kind: 'function',
    weight: 0.15,
    required: true,
  },
  { signature: 'Transfer(address,address,uint256)', kind: 'event', weight: 0.08, required: false },
  { signature: 'Approval(address,address,uint256)', kind: 'event', weight: 0.04, required: false },
  { signature: 'name()', kind: 'function', weight: 0.01, required: false },
  { signature: 'symbol()', kind: 'function', weight: 0.01, required: false },
  { signature: 'decimals()', kind: 'function', weight: 0.01, required: false },
];

/** Minimal viable set: without these, it is not an ERC-20. */
const CORE_REQUIRED = new Set([
  'totalSupply()',
  'balanceOf(address)',
  'transfer(address,uint256)',
  'approve(address,uint256)',
  'allowance(address,address)',
  'transferFrom(address,address,uint256)',
]);

/**
 * Deterministically detect the ERC-20 standard from a contract model, returning
 * a confidence score and human-readable evidence (ADR-001). No network access.
 */
export function detectErc20(model: ContractModel): StandardDetection {
  const functionSignatures = new Set(model.functions.map((f) => f.signature));
  const eventSignatures = new Set(model.events.map((e) => e.signature));

  const evidence: Evidence[] = [];
  const matched: string[] = [];
  const missing: string[] = [];
  let confidence = 0;

  for (const member of ERC20_MEMBERS) {
    const present =
      member.kind === 'function'
        ? functionSignatures.has(member.signature)
        : eventSignatures.has(member.signature);
    if (present) {
      confidence += member.weight;
      matched.push(member.signature);
      evidence.push({
        source: member.kind === 'event' ? 'event' : 'signature',
        detail: `${member.kind === 'event' ? 'Event' : 'Function'} ${member.signature} present`,
        weight: member.weight,
      });
    } else if (member.required) {
      missing.push(member.signature);
    }
  }

  const hasAllCore = [...CORE_REQUIRED].every((sig) => functionSignatures.has(sig));
  const detected = hasAllCore && confidence >= 0.7;
  if (!hasAllCore) {
    evidence.push({
      source: 'signature',
      detail: `Missing required ERC-20 functions: ${missing.join(', ')}`,
    });
  }

  return {
    standard: 'erc-20',
    detected,
    confidence: Math.min(1, Number(confidence.toFixed(4))),
    evidence,
    matched,
    missing,
  };
}

/**
 * Canonical semantics for well-known ERC-20 (and common extension) functions.
 * Consumed by the classifier to route operations. Signatures are exact.
 */
export const ERC20_FUNCTION_SEMANTICS: Record<string, FunctionSemantic> = {
  'transfer(address,uint256)': {
    operationType: 'token-transfer',
    audience: 'user',
    title: 'Transfer tokens',
    description: 'Send tokens to another address.',
    isRead: false,
    risk: 'low',
  },
  'transferFrom(address,address,uint256)': {
    operationType: 'token-transfer',
    audience: 'user',
    title: 'Transfer from',
    description: 'Move tokens from one address to another using an allowance.',
    isRead: false,
    risk: 'medium',
  },
  'approve(address,uint256)': {
    operationType: 'token-approve',
    audience: 'user',
    title: 'Approve spender',
    description: 'Allow a spender to move tokens on your behalf.',
    isRead: false,
    risk: 'medium',
  },
  'balanceOf(address)': {
    operationType: 'read',
    audience: 'user',
    title: 'Balance of',
    isRead: true,
  },
  'allowance(address,address)': {
    operationType: 'read',
    audience: 'user',
    title: 'Allowance',
    isRead: true,
  },
  'totalSupply()': {
    operationType: 'read',
    audience: 'user',
    title: 'Total supply',
    isRead: true,
  },
  'name()': { operationType: 'read', audience: 'user', title: 'Name', isRead: true },
  'symbol()': { operationType: 'read', audience: 'user', title: 'Symbol', isRead: true },
  'decimals()': { operationType: 'read', audience: 'user', title: 'Decimals', isRead: true },
  'mint(address,uint256)': {
    operationType: 'token-mint',
    audience: 'admin',
    title: 'Mint tokens',
    description: 'Create new tokens. Privileged.',
    isRead: false,
    risk: 'high',
  },
  'burn(uint256)': {
    operationType: 'token-burn',
    audience: 'user',
    title: 'Burn tokens',
    isRead: false,
    risk: 'medium',
  },
};

/** Look up the canonical semantic of a known ERC-20 function signature. */
export function erc20Semantic(signature: string): FunctionSemantic | undefined {
  return ERC20_FUNCTION_SEMANTICS[signature];
}

/** ERC-20 as a pluggable detector for the standards registry. */
export const erc20Detector: StandardDetector = {
  id: 'erc-20',
  detect: detectErc20,
  semantics: ERC20_FUNCTION_SEMANTICS,
};
