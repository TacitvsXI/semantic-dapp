import { describe, it, expect } from 'vitest';
import type { Abi } from 'abitype';
import { normalizeAbi } from '@semantic-dapp/spec';
import { detectErc20 } from './erc20.js';
import { detectErc4626 } from './standards.js';
import { detectAccessControl, detectPausable } from './capabilities.js';
import { detectAccessModel } from './access.js';
import { resolveSemantics } from './registry.js';
// Real ABIs compiled by Foundry from contracts/fixtures (regenerate: `pnpm gen:abi`).
import mockErc20Abi from '../../../contracts/fixtures/abi/MockERC20.json';
import mockVaultAbi from '../../../contracts/fixtures/abi/MockVault.json';
import mockRwaAbi from '../../../contracts/fixtures/abi/MockRWA.json';

const erc20 = normalizeAbi(mockErc20Abi as Abi);
const vault = normalizeAbi(mockVaultAbi as Abi);
const rwa = normalizeAbi(mockRwaAbi as Abi);

describe('MockERC20 fixture', () => {
  it('is detected as an ERC-20', () => {
    const result = detectErc20(erc20);
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('is not a vault', () => {
    expect(detectErc4626(erc20).detected).toBe(false);
  });
});

describe('MockVault fixture', () => {
  it('is detected as an ERC-4626 vault', () => {
    const result = detectErc4626(vault);
    expect(result.detected).toBe(true);
  });

  it('is also detected as an ERC-20 (shares)', () => {
    expect(detectErc20(vault).detected).toBe(true);
  });

  it('resolves the erc-4626 standard', () => {
    expect(resolveSemantics(vault).detected).toContain('erc-4626');
  });
});

describe('MockRWA fixture', () => {
  it('is detected as access-control + pausable', () => {
    expect(detectAccessControl(rwa).detected).toBe(true);
    expect(detectPausable(rwa).detected).toBe(true);
  });

  it('infers an access-control access model', () => {
    expect(detectAccessModel(rwa).kind).toBe('access-control');
  });

  it('resolves both capabilities as standards', () => {
    const { detected } = resolveSemantics(rwa);
    expect(detected).toEqual(expect.arrayContaining(['erc-20', 'access-control', 'pausable']));
  });
});
