import { describe, it, expect } from 'vitest';
import { loadFromAbi } from './loadContract.js';

const ERC20_ABI = JSON.stringify([
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'a', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'o', type: 'address' },
      { name: 's', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 's', type: 'address' },
      { name: 'a', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'transferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'f', type: 'address' },
      { name: 't', type: 'address' },
      { name: 'a', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
]);

describe('loadFromAbi', () => {
  it('builds a bundle with a classified manifest', () => {
    const result = loadFromAbi({
      abiText: ERC20_ABI,
      chainId: 1,
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      name: 'Test',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bundle.chainId).toBe(1);
    expect(result.bundle.manifest.operations.length).toBeGreaterThan(0);
    expect(result.bundle.manifest.contracts[0]?.standards).toContain('erc-20');
  });

  it('rejects invalid JSON', () => {
    const result = loadFromAbi({ abiText: '{nope', chainId: 1 });
    expect(result.ok).toBe(false);
  });
});
