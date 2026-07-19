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
