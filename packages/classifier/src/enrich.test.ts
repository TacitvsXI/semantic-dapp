import { describe, it, expect } from 'vitest';
import type { Abi } from 'abitype';
import { normalizeAbi } from '@semantic-dapp/spec';
import type { SourceDocs } from '@semantic-dapp/analyzer';
import { classifyContract } from './classify.js';

function fn(name: string, inputs: string[], outputs: string[], mut = 'nonpayable') {
  return {
    type: 'function',
    name,
    stateMutability: mut,
    inputs: inputs.map((type, i) => ({ name: `a${i}`, type })),
    outputs: outputs.map((type) => ({ name: '', type })),
  } as const;
}

const abi = [fn('withdraw', ['uint256'], []), fn('poke', ['uint256'], [])] as const satisfies Abi;

describe('enrichOperations (via classifyContract docs)', () => {
  const model = normalizeAbi(abi as unknown as Abi);

  it('attaches @notice as a description and @param as an input label', () => {
    const docs: SourceDocs = {
      withdraw: [
        {
          name: 'withdraw',
          paramTypes: ['uint256'],
          modifiers: [],
          notice: 'Withdraw your funds.',
          params: { a0: 'Amount in wei.' },
        },
      ],
    };
    const { operations } = classifyContract(model, 'c', { docs });
    const w = operations.find((o) => o.function === 'withdraw(uint256)');
    expect(w?.description).toBe('Withdraw your funds.');
    expect(w?.inputs[0]?.description).toBe('Amount in wei.');
    expect(w?.evidence.some((e) => e.source === 'natspec')).toBe(true);
  });

  it('upgrades a user verdict to admin when a privileged modifier gates it', () => {
    const docs: SourceDocs = {
      withdraw: [{ name: 'withdraw', paramTypes: ['uint256'], modifiers: ['onlyOwner'] }],
    };
    const { operations } = classifyContract(model, 'c', { docs });
    const w = operations.find((o) => o.function === 'withdraw(uint256)');
    // Without docs this is a user action (shape-aware rule); the modifier promotes it.
    expect(w?.audience).toBe('admin');
    expect(w?.permission?.kind).toBe('ownable');
    expect(w?.confidence).toBeGreaterThanOrEqual(0.8);
    expect(w?.evidence.some((e) => e.source === 'modifier')).toBe(true);
  });

  it('carries the role from onlyRole(...) into the permission', () => {
    const docs: SourceDocs = {
      withdraw: [
        { name: 'withdraw', paramTypes: ['uint256'], modifiers: ['onlyRole(TREASURER_ROLE)'] },
      ],
    };
    const { operations } = classifyContract(model, 'c', { docs });
    const w = operations.find((o) => o.function === 'withdraw(uint256)');
    expect(w?.permission).toMatchObject({ kind: 'access-control', role: 'TREASURER_ROLE' });
  });

  it('never demotes: no modifier leaves the user verdict intact', () => {
    const docs: SourceDocs = {
      withdraw: [{ name: 'withdraw', paramTypes: ['uint256'], modifiers: ['nonReentrant'] }],
    };
    const { operations } = classifyContract(model, 'c', { docs });
    const w = operations.find((o) => o.function === 'withdraw(uint256)');
    expect(w?.audience).toBe('user');
  });
});
