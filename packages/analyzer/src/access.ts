import type { ContractModel } from '@semantic-dapp/spec';
import type { AccessModel } from './types.js';

/**
 * Infer how privileged actions are gated. AccessControl (role-based) takes
 * precedence over Ownable when both are present, since roles are the finer model.
 */
export function detectAccessModel(model: ContractModel): AccessModel {
  const fns = new Set(model.functions.map((f) => f.signature));

  if (fns.has('hasRole(bytes32,address)') && fns.has('getRoleAdmin(bytes32)')) {
    return {
      kind: 'access-control',
      evidence: [{ source: 'signature', detail: 'AccessControl: hasRole/getRoleAdmin present' }],
    };
  }

  if (fns.has('owner()')) {
    return {
      kind: 'ownable',
      evidence: [{ source: 'signature', detail: 'Ownable: owner() present' }],
    };
  }

  return { kind: 'none', evidence: [] };
}
