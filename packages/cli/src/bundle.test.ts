import { describe, it, expect } from 'vitest';
import { abiFromJson, bundleFromInputs } from './bundle.js';
import { parseArgs } from './args.js';

const ERC20_ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

describe('abiFromJson', () => {
  it('accepts a bare ABI array', () => {
    expect(abiFromJson(ERC20_ABI)).toHaveLength(2);
  });

  it('accepts a Foundry/Hardhat artifact', () => {
    expect(abiFromJson({ abi: ERC20_ABI, bytecode: '0x' })).toHaveLength(2);
  });

  it('rejects unrelated JSON', () => {
    expect(() => abiFromJson({ foo: 'bar' })).toThrow();
  });
});

describe('bundleFromInputs', () => {
  it('classifies the ABI into a bundle', () => {
    const bundle = bundleFromInputs({
      abi: ERC20_ABI as never,
      name: 'Demo',
      chainId: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(bundle.name).toBe('Demo');
    expect(bundle.chainId).toBe(1);
    expect(bundle.manifest.operations.length).toBeGreaterThan(0);
  });
});

describe('parseArgs', () => {
  it('parses command, flags and booleans', () => {
    const args = parseArgs(['bundle', '--abi', 'a.json', '--name=Demo', '--force', '-v']);
    expect(args.command).toBe('bundle');
    expect(args.flags.abi).toBe('a.json');
    expect(args.flags.name).toBe('Demo');
    expect(args.booleans.has('force')).toBe(true);
    expect(args.booleans.has('v')).toBe(true);
  });
});
