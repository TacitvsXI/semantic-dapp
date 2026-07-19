import { describe, it, expect } from 'vitest';
import type { Abi } from 'abitype';
import { normalizeAbi } from '@semantic-dapp/spec';
import { buildManifest } from './classify.js';
// Real ABIs compiled by Foundry from contracts/fixtures (regenerate: `pnpm gen:abi`).
import mockVaultAbi from '../../../contracts/fixtures/abi/MockVault.json';
import mockRwaAbi from '../../../contracts/fixtures/abi/MockRWA.json';

describe('buildManifest — MockVault (ERC-4626)', () => {
  const model = normalizeAbi(mockVaultAbi as Abi);
  const manifest = buildManifest(model, { projectName: 'Vault', contractId: 'vault' });
  const op = (sig: string) => manifest.operations.find((o) => o.function === sig);

  it('detects erc-4626 and erc-20', () => {
    expect(manifest.contracts[0]?.standards).toEqual(
      expect.arrayContaining(['erc-20', 'erc-4626']),
    );
  });

  it('exposes the vault write operations', () => {
    for (const sig of [
      'deposit(uint256,address)',
      'withdraw(uint256,address,address)',
      'redeem(uint256,address,address)',
      'mint(uint256,address)',
    ]) {
      expect(op(sig), sig).toBeDefined();
      expect(op(sig)?.isRead, sig).toBe(false);
    }
  });

  it('classifies convertToShares as a read', () => {
    expect(op('convertToShares(uint256)')?.isRead).toBe(true);
  });

  it('never drops a function', () => {
    expect(manifest.operations).toHaveLength(model.functions.length);
  });
});

describe('buildManifest — MockRWA (roles + pause)', () => {
  const model = normalizeAbi(mockRwaAbi as Abi);
  const manifest = buildManifest(model, { projectName: 'RWA', contractId: 'rwa' });
  const op = (sig: string) => manifest.operations.find((o) => o.function === sig);

  it('detects access-control, pausable and erc-20', () => {
    expect(manifest.contracts[0]?.standards).toEqual(
      expect.arrayContaining(['erc-20', 'access-control', 'pausable']),
    );
  });

  it('routes grantRole to admin as an access-control permission', () => {
    const grant = op('grantRole(bytes32,address)');
    expect(grant?.audience).toBe('admin');
    expect(grant?.operationType).toBe('role-grant');
    expect(grant?.permission?.kind).toBe('access-control');
  });

  it('routes pause to the emergency audience', () => {
    expect(op('pause()')?.operationType).toBe('pause');
    expect(op('pause()')?.audience).toBe('emergency');
  });

  it('routes mint to admin as a token-mint', () => {
    expect(op('mint(address,uint256)')?.operationType).toBe('token-mint');
    expect(op('mint(address,uint256)')?.audience).toBe('admin');
  });
});
