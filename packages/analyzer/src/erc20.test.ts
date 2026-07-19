import { describe, it, expect } from 'vitest';
import type { Abi } from 'abitype';
import { normalizeAbi } from '@semantic-dapp/spec';
import { detectErc20, erc20Semantic } from './erc20.js';

function fn(name: string, inputs: string[], outputs: string[], mut = 'nonpayable') {
  return {
    type: 'function',
    name,
    stateMutability: mut,
    inputs: inputs.map((type, i) => ({ name: `a${i}`, type })),
    outputs: outputs.map((type) => ({ name: '', type })),
  } as const;
}

const transferEvent = {
  type: 'event',
  name: 'Transfer',
  anonymous: false,
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
} as const;

const approvalEvent = {
  type: 'event',
  name: 'Approval',
  anonymous: false,
  inputs: [
    { name: 'owner', type: 'address', indexed: true },
    { name: 'spender', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
} as const;

const fullErc20Abi = [
  fn('totalSupply', [], ['uint256'], 'view'),
  fn('balanceOf', ['address'], ['uint256'], 'view'),
  fn('transfer', ['address', 'uint256'], ['bool']),
  fn('allowance', ['address', 'address'], ['uint256'], 'view'),
  fn('approve', ['address', 'uint256'], ['bool']),
  fn('transferFrom', ['address', 'address', 'uint256'], ['bool']),
  fn('name', [], ['string'], 'view'),
  fn('symbol', [], ['string'], 'view'),
  fn('decimals', [], ['uint8'], 'view'),
  transferEvent,
  approvalEvent,
] as const satisfies Abi;

describe('detectErc20', () => {
  it('detects a full ERC-20 with high confidence', () => {
    const model = normalizeAbi(fullErc20Abi as unknown as Abi);
    const result = detectErc20(model);
    expect(result.detected).toBe(true);
    expect(result.standard).toBe('erc-20');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.missing).toHaveLength(0);
    expect(result.matched).toContain('transfer(address,uint256)');
  });

  it('produces evidence with weights', () => {
    const model = normalizeAbi(fullErc20Abi as unknown as Abi);
    const result = detectErc20(model);
    const transferEvidence = result.evidence.find((e) =>
      e.detail.includes('transfer(address,uint256)'),
    );
    expect(transferEvidence?.weight).toBeGreaterThan(0);
  });

  it('does not detect a non-ERC-20 contract', () => {
    const counterAbi = [
      fn('number', [], ['uint256'], 'view'),
      fn('increment', [], []),
    ] as const satisfies Abi;
    const model = normalizeAbi(counterAbi as unknown as Abi);
    const result = detectErc20(model);
    expect(result.detected).toBe(false);
    expect(result.missing).toContain('transfer(address,uint256)');
  });

  it('does not detect when a core function is missing', () => {
    const partial = [
      fn('totalSupply', [], ['uint256'], 'view'),
      fn('balanceOf', ['address'], ['uint256'], 'view'),
      fn('transfer', ['address', 'uint256'], ['bool']),
      fn('approve', ['address', 'uint256'], ['bool']),
      fn('allowance', ['address', 'address'], ['uint256'], 'view'),
      // transferFrom intentionally missing
    ] as const satisfies Abi;
    const model = normalizeAbi(partial as unknown as Abi);
    const result = detectErc20(model);
    expect(result.detected).toBe(false);
    expect(result.missing).toContain('transferFrom(address,address,uint256)');
  });
});

describe('erc20Semantic', () => {
  it('maps transfer to a user token-transfer', () => {
    expect(erc20Semantic('transfer(address,uint256)')).toMatchObject({
      operationType: 'token-transfer',
      audience: 'user',
      isRead: false,
    });
  });

  it('maps mint to an admin high-risk operation', () => {
    expect(erc20Semantic('mint(address,uint256)')).toMatchObject({
      audience: 'admin',
      risk: 'high',
    });
  });

  it('returns undefined for unknown signatures', () => {
    expect(erc20Semantic('foo()')).toBeUndefined();
  });
});
