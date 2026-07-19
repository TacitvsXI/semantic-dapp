import { describe, it, expect } from 'vitest';
import type { Abi } from 'abitype';
import { normalizeAbi } from '@semantic-dapp/spec';
import { classifyContract, buildManifest } from './classify.js';
import { applyReview, mergeReviewed } from './review.js';

function fn(name: string, inputs: string[], outputs: string[], mut = 'nonpayable') {
  return {
    type: 'function',
    name,
    stateMutability: mut,
    inputs: inputs.map((type, i) => ({ name: `a${i}`, type })),
    outputs: outputs.map((type) => ({ name: '', type })),
  } as const;
}

const erc20Abi = [
  fn('totalSupply', [], ['uint256'], 'view'),
  fn('balanceOf', ['address'], ['uint256'], 'view'),
  fn('transfer', ['address', 'uint256'], ['bool']),
  fn('allowance', ['address', 'address'], ['uint256'], 'view'),
  fn('approve', ['address', 'uint256'], ['bool']),
  fn('transferFrom', ['address', 'address', 'uint256'], ['bool']),
  fn('name', [], ['string'], 'view'),
  fn('symbol', [], ['string'], 'view'),
  fn('decimals', [], ['uint8'], 'view'),
  fn('mint', ['address', 'uint256'], []),
  fn('secretKnob', ['uint256'], []),
] as const satisfies Abi;

const model = normalizeAbi(erc20Abi as unknown as Abi);

describe('classifyContract', () => {
  const result = classifyContract(model, 'token');

  it('detects the ERC-20 standard', () => {
    expect(result.standards).toContain('erc-20');
  });

  it('routes transfer to the user audience as a token-transfer', () => {
    const transfer = result.operations.find((o) => o.function === 'transfer(address,uint256)');
    expect(transfer?.audience).toBe('user');
    expect(transfer?.operationType).toBe('token-transfer');
    expect(transfer?.confidence).toBeGreaterThanOrEqual(0.7);
    expect(transfer?.visibility).toBe('visible');
  });

  it('marks transfer amount as a token-amount widget', () => {
    const transfer = result.operations.find((o) => o.function === 'transfer(address,uint256)');
    const amount = transfer?.inputs.find((i) => i.name === 'a1');
    expect(amount?.widget).toBe('token-amount');
  });

  it('routes mint to the admin audience with high risk', () => {
    const mint = result.operations.find((o) => o.function === 'mint(address,uint256)');
    expect(mint?.audience).toBe('admin');
    expect(mint?.risk?.level).toBe('high');
  });

  it('falls back unknown functions to raw-only / developer', () => {
    const unknown = result.operations.find((o) => o.function === 'secretKnob(uint256)');
    expect(unknown?.audience).toBe('developer');
    expect(unknown?.visibility).toBe('raw-only');
    expect(unknown?.operationType).toBe('unknown');
  });

  it('never drops a function', () => {
    expect(result.operations).toHaveLength(model.functions.length);
  });
});

describe('buildManifest', () => {
  it('produces a valid manifest with contract identity', () => {
    const manifest = buildManifest(model, {
      projectName: 'FIX',
      contractId: 'token',
      chainId: 31337,
      address: '0x1111111111111111111111111111111111111111',
    });
    expect(manifest.version).toBe(1);
    expect(manifest.contracts[0]?.standards).toContain('erc-20');
    expect(manifest.operations.length).toBe(model.functions.length);
  });

  it('records implementation binding fields', () => {
    const manifest = buildManifest(model, {
      projectName: 'FIX',
      contractId: 'token',
      abiSource: 'sourcify',
      implementationAddress: '0x2222222222222222222222222222222222222222',
      implementationCodeHash: '0xdeadbeef',
    });
    expect(manifest.contracts[0]?.abiSource).toBe('sourcify');
    expect(manifest.contracts[0]?.implementationAddress).toBe(
      '0x2222222222222222222222222222222222222222',
    );
    expect(manifest.contracts[0]?.implementationCodeHash).toBe('0xdeadbeef');
  });
});

describe('mergeReviewed', () => {
  it('preserves reviewed display fields but refreshes analysis', () => {
    const previous0 = buildManifest(model, { projectName: 'FIX', contractId: 'token' });
    const transferId = previous0.operations.find(
      (o) => o.function === 'transfer(address,uint256)',
    )!.id;

    // Human edits an operation.
    let previous = applyReview(previous0, transferId, { type: 'set-title', title: 'Send tokens' });
    previous = applyReview(previous, transferId, { type: 'set-audience', audience: 'operator' });

    // A fresh analysis (defaults) is merged in.
    const fresh = buildManifest(model, { projectName: 'FIX', contractId: 'token' });
    const merged = mergeReviewed(previous, fresh);

    const mergedTransfer = merged.operations.find((o) => o.id === transferId);
    expect(mergedTransfer?.title).toBe('Send tokens');
    expect(mergedTransfer?.audience).toBe('operator');
    expect(mergedTransfer?.reviewed).toBe(true);

    // Non-reviewed operations come straight from the fresh analysis.
    const mint = merged.operations.find((o) => o.function === 'mint(address,uint256)');
    expect(mint?.reviewed).toBe(false);
    expect(mint?.audience).toBe('admin');
  });
});

const adminAbi = [
  fn('hasRole', ['bytes32', 'address'], ['bool'], 'view'),
  fn('getRoleAdmin', ['bytes32'], ['bytes32'], 'view'),
  fn('grantRole', ['bytes32', 'address'], []),
  fn('revokeRole', ['bytes32', 'address'], []),
  fn('renounceRole', ['bytes32', 'address'], []),
  fn('paused', [], ['bool'], 'view'),
  fn('pause', [], []),
  fn('unpause', [], []),
  fn('upgradeToAndCall', ['address', 'bytes'], [], 'payable'),
] as const satisfies Abi;

describe('classifyContract — access-controlled admin contract', () => {
  const adminModel = normalizeAbi(adminAbi as unknown as Abi);
  const result = classifyContract(adminModel, 'admin');

  it('detects access-control, pausable and upgradeable', () => {
    expect(result.standards).toEqual(
      expect.arrayContaining(['access-control', 'pausable', 'upgradeable']),
    );
  });

  it('routes grantRole to admin as an access-control permission', () => {
    const grant = result.operations.find((o) => o.function === 'grantRole(bytes32,address)');
    expect(grant?.audience).toBe('admin');
    expect(grant?.operationType).toBe('role-grant');
    expect(grant?.permission?.kind).toBe('access-control');
  });

  it('routes pause/unpause to the emergency audience', () => {
    const pause = result.operations.find((o) => o.function === 'pause()');
    expect(pause?.audience).toBe('emergency');
    expect(pause?.operationType).toBe('pause');
    expect(pause?.permission?.kind).toBe('access-control');
  });

  it('flags upgrade as critical for the admin audience', () => {
    const upgrade = result.operations.find((o) => o.function === 'upgradeToAndCall(address,bytes)');
    expect(upgrade?.audience).toBe('admin');
    expect(upgrade?.operationType).toBe('upgrade');
    expect(upgrade?.risk?.level).toBe('critical');
  });
});

const nftAbi = [
  fn('balanceOf', ['address'], ['uint256'], 'view'),
  fn('ownerOf', ['uint256'], ['address'], 'view'),
  fn('getApproved', ['uint256'], ['address'], 'view'),
  fn('isApprovedForAll', ['address', 'address'], ['bool'], 'view'),
  fn('approve', ['address', 'uint256'], []),
  fn('setApprovalForAll', ['address', 'bool'], []),
  fn('transferFrom', ['address', 'address', 'uint256'], []),
  fn('safeTransferFrom', ['address', 'address', 'uint256'], []),
  fn('safeTransferFrom', ['address', 'address', 'uint256', 'bytes'], []),
] as const satisfies Abi;

describe('classifyContract — ERC-721', () => {
  const nftModel = normalizeAbi(nftAbi as unknown as Abi);
  const result = classifyContract(nftModel, 'nft');

  it('detects erc-721', () => {
    expect(result.standards).toContain('erc-721');
  });

  it('routes safeTransferFrom to the user audience', () => {
    const op = result.operations.find(
      (o) => o.function === 'safeTransferFrom(address,address,uint256)',
    );
    expect(op?.audience).toBe('user');
    expect(op?.operationType).toBe('token-transfer');
  });

  it('renders the tokenId input as a token-id widget (not an amount)', () => {
    const op = result.operations.find((o) => o.function === 'approve(address,uint256)');
    const tokenId = op?.inputs.find((i) => i.type === 'uint256');
    // ERC-721 approve's uint256 is a token id, not a fungible amount.
    expect(tokenId?.widget).not.toBe('token-amount');
  });
});

describe('applyReview', () => {
  it('confirms and moves operations, marking them reviewed', () => {
    const manifest = buildManifest(model, { projectName: 'FIX', contractId: 'token' });
    const transferId = manifest.operations.find(
      (o) => o.function === 'transfer(address,uint256)',
    )!.id;

    const confirmed = applyReview(manifest, transferId, { type: 'confirm' });
    expect(confirmed.operations.find((o) => o.id === transferId)?.reviewed).toBe(true);

    const moved = applyReview(confirmed, transferId, { type: 'move-to-raw' });
    expect(moved.operations.find((o) => o.id === transferId)?.visibility).toBe('raw-only');

    const readdressed = applyReview(moved, transferId, {
      type: 'set-audience',
      audience: 'admin',
    });
    expect(readdressed.operations.find((o) => o.id === transferId)?.audience).toBe('admin');
  });
});
