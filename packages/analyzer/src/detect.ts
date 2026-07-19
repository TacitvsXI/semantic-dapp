import type { ContractModel, Evidence } from '@semantic-dapp/spec';
import type { StandardDetection } from './types.js';

/** Minimal ERC-20 core, used as a prerequisite by some standards (e.g. ERC-4626). */
export const ERC20_CORE = [
  'totalSupply()',
  'balanceOf(address)',
  'transfer(address,uint256)',
  'approve(address,uint256)',
  'allowance(address,address)',
  'transferFrom(address,address,uint256)',
];

export interface StandardMember {
  signature: string;
  kind: 'function' | 'event';
  required: boolean;
}

export interface DetectSpec {
  standard: string;
  members: StandardMember[];
  /** Function signatures that must all be present for a positive detection. */
  coreRequired: string[];
  /** Minimum confidence to count as detected (default 0.6). */
  threshold?: number;
  /** When true, the contract must also expose the ERC-20 core (e.g. ERC-4626). */
  requiresErc20?: boolean;
}

/**
 * Deterministically score a contract model against a declarative spec. Confidence
 * weighs required members at 0.9 and optional members/events at 0.1. Detection
 * additionally requires the full `coreRequired` set (and ERC-20 core when asked).
 */
export function detectByMembers(model: ContractModel, spec: DetectSpec): StandardDetection {
  const fns = new Set(model.functions.map((f) => f.signature));
  const evs = new Set(model.events.map((e) => e.signature));
  const present = (m: StandardMember) =>
    m.kind === 'function' ? fns.has(m.signature) : evs.has(m.signature);

  const required = spec.members.filter((m) => m.required);
  const optional = spec.members.filter((m) => !m.required);
  const reqMatched = required.filter(present);
  const optMatched = optional.filter(present);

  const matched = [...reqMatched, ...optMatched].map((m) => m.signature);
  const missing = required.filter((m) => !present(m)).map((m) => m.signature);

  const reqScore = required.length ? reqMatched.length / required.length : 1;
  const optScore = optional.length ? optMatched.length / optional.length : 0;
  const confidence = Math.min(1, Number((reqScore * 0.9 + optScore * 0.1).toFixed(4)));

  const coreOk = spec.coreRequired.every((s) => fns.has(s));
  const erc20Ok = spec.requiresErc20 ? ERC20_CORE.every((s) => fns.has(s)) : true;
  const threshold = spec.threshold ?? 0.6;
  const detected = coreOk && erc20Ok && confidence >= threshold;

  const evidence: Evidence[] = matched.map((sig) => ({
    source: 'signature',
    detail: `${spec.standard}: ${sig} present`,
  }));
  if (!coreOk) {
    evidence.push({
      source: 'signature',
      detail: `${spec.standard}: missing required members: ${missing.join(', ') || '(core)'}`,
    });
  }
  if (spec.requiresErc20 && !erc20Ok) {
    evidence.push({ source: 'signature', detail: `${spec.standard}: not an ERC-20 share token` });
  }

  return { standard: spec.standard, detected, confidence, evidence, matched, missing };
}
