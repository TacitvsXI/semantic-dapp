import { describe, it, expect } from 'vitest';
import type { Abi } from 'abitype';
import { normalizeAbi, selectorSet } from './abi.js';

const erc20Fragment = [
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
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Transfer',
    anonymous: false,
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'error',
    name: 'InsufficientBalance',
    inputs: [
      { name: 'available', type: 'uint256' },
      { name: 'required', type: 'uint256' },
    ],
  },
  {
    type: 'constructor',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'owner', type: 'address' }],
  },
  { type: 'receive', stateMutability: 'payable' },
] as const satisfies Abi;

describe('normalizeAbi', () => {
  const model = normalizeAbi(erc20Fragment as unknown as Abi);

  it('separates functions, events and errors', () => {
    expect(model.functions).toHaveLength(3);
    expect(model.events).toHaveLength(1);
    expect(model.errors).toHaveLength(1);
  });

  it('computes canonical signatures and selectors', () => {
    const transfer = model.functions.find((f) => f.name === 'transfer');
    expect(transfer?.signature).toBe('transfer(address,uint256)');
    expect(transfer?.selector).toBe('0xa9059cbb');
  });

  it('flags read vs write and payable functions', () => {
    const balanceOf = model.functions.find((f) => f.name === 'balanceOf');
    const transfer = model.functions.find((f) => f.name === 'transfer');
    const deposit = model.functions.find((f) => f.name === 'deposit');
    expect(balanceOf?.isRead).toBe(true);
    expect(transfer?.isRead).toBe(false);
    expect(deposit?.isPayable).toBe(true);
  });

  it('captures the event topic hash', () => {
    expect(model.events[0]?.topic).toBe(
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    );
  });

  it('records the constructor and receive presence', () => {
    expect(model.deployConstructor?.inputs[0]?.name).toBe('owner');
    expect(model.hasReceive).toBe(true);
    expect(model.hasFallback).toBe(false);
  });

  it('exposes a selector set', () => {
    const set = selectorSet(model);
    expect(set.has('0xa9059cbb')).toBe(true);
    expect(set.size).toBe(3);
  });
});
