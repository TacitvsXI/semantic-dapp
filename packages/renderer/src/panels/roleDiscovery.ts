import { keccak256, toBytes } from 'viem';
import type { ContractFunction, ContractModel } from '@semantic-dapp/spec';
import type { RoleOption } from '@semantic-dapp/components';

export const ZERO_ROLE = `0x${'00'.repeat(32)}` as const;

/**
 * Compute a role's bytes32 id from its constant name using the OpenZeppelin
 * AccessControl convention: `DEFAULT_ADMIN_ROLE` is `0x00…0`; every other role
 * constant is `keccak256(bytes(NAME))`. Used as an offline fallback so the role
 * dropdown works even before an on-chain read confirms the exact value.
 *
 * This is contract-agnostic: it derives the value from the getter's own name,
 * so it applies to any AccessControl contract, not a specific one.
 */
export function computeRoleValue(name: string): `0x${string}` {
  if (name === 'DEFAULT_ADMIN_ROLE') return ZERO_ROLE;
  return keccak256(toBytes(name));
}

/**
 * Discover a contract's role-constant getters straight from its ABI: no-arg
 * `view`/`pure` functions that return a single `bytes32` and whose name mentions
 * "role" (e.g. `MINTER_ROLE`, `DEFAULT_ADMIN_ROLE`, `PAUSER_ROLE`). Nothing is
 * hardcoded per contract — any contract exposing such getters is supported.
 */
export function roleGetters(model: ContractModel): ContractFunction[] {
  return model.functions.filter(
    (f) =>
      f.isRead &&
      f.inputs.length === 0 &&
      f.outputs.length === 1 &&
      f.outputs[0]!.type === 'bytes32' &&
      /role/i.test(f.name),
  );
}

/** True for a 32-byte hex string. */
export function isBytes32(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * Build the initial role dropdown options from the ABI alone, computing each
 * value locally (OZ convention). Exact on-chain values refine these later.
 */
export function initialRoleOptions(model: ContractModel): RoleOption[] {
  return roleGetters(model).map((fn) => ({ name: fn.name, value: computeRoleValue(fn.name) }));
}
