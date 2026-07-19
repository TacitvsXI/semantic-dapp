import { describe, it, expect } from 'vitest';
import { keccak256, toBytes } from 'viem';
import { normalizeAbi } from '@semantic-dapp/spec';
import mockRwaAbi from '../../../contracts/fixtures/abi/MockRWA.json';
import mockVaultAbi from '../../../contracts/fixtures/abi/MockVault.json';
import mockErc20Abi from '../../../contracts/fixtures/abi/MockERC20.json';
import {
  ZERO_ROLE,
  computeRoleValue,
  initialRoleOptions,
  roleGetters,
} from './panels/roleDiscovery.js';

// These tests intentionally run against *different* compiled contracts than the
// one used in the UI screenshots, to prove role discovery is ABI-driven and
// generic — nothing is hardcoded for a specific contract.

describe('computeRoleValue (OZ AccessControl convention)', () => {
  it('maps DEFAULT_ADMIN_ROLE to the zero hash', () => {
    expect(computeRoleValue('DEFAULT_ADMIN_ROLE')).toBe(ZERO_ROLE);
  });

  it('hashes any other role name with keccak256', () => {
    for (const name of ['MINTER_ROLE', 'PAUSER_ROLE', 'FEE_ADMIN_ROLE', 'ANYTHING_ROLE']) {
      expect(computeRoleValue(name)).toBe(keccak256(toBytes(name)));
    }
  });
});

describe('roleGetters — discovered from an arbitrary ABI', () => {
  it('finds the role constants exposed by MockRWA', () => {
    const model = normalizeAbi(mockRwaAbi);
    const names = roleGetters(model)
      .map((f) => f.name)
      .sort();
    expect(names).toContain('MINTER_ROLE');
    expect(names).toContain('PAUSER_ROLE');
    expect(names).toContain('DEFAULT_ADMIN_ROLE');
  });

  it('computes correct bytes32 ids for the discovered roles', () => {
    const options = initialRoleOptions(normalizeAbi(mockRwaAbi));
    const byName = Object.fromEntries(options.map((o) => [o.name, o.value]));
    expect(byName.DEFAULT_ADMIN_ROLE).toBe(ZERO_ROLE);
    expect(byName.MINTER_ROLE).toBe(keccak256(toBytes('MINTER_ROLE')));
    expect(byName.PAUSER_ROLE).toBe(keccak256(toBytes('PAUSER_ROLE')));
  });

  it('returns no roles for contracts without role getters (MockVault, MockERC20)', () => {
    expect(roleGetters(normalizeAbi(mockVaultAbi))).toHaveLength(0);
    expect(roleGetters(normalizeAbi(mockErc20Abi))).toHaveLength(0);
  });

  it('ignores non-bytes32 and parameterized functions', () => {
    // hasRole(bytes32,address) takes args; getRoleAdmin(bytes32) takes an arg;
    // neither is a no-arg bytes32 constant getter, so must not be treated as one.
    const model = normalizeAbi(mockRwaAbi);
    const names = roleGetters(model).map((f) => f.name);
    expect(names).not.toContain('hasRole');
    expect(names).not.toContain('getRoleAdmin');
  });
});
