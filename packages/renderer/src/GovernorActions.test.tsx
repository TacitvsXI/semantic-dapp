import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { normalizeAbi } from '@semantic-dapp/spec';
import type { ContractFunction } from '@semantic-dapp/spec';
import { GovernorActions } from './GovernorActions.js';
import type { ContractRuntime } from './runtime.js';

const ABI = [
  {
    type: 'function',
    name: 'propose',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'description', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'castVote',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

function mockRuntime(write: (func: ContractFunction, args: unknown[]) => void): ContractRuntime {
  return {
    wallet: {
      isConnected: true,
      address: '0x0000000000000000000000000000000000000001',
      connect: () => {},
      disconnect: () => {},
    },
    callRead: async () => [],
    submitWrite: async (func, args) => write(func, args),
    getTxState: () => ({ phase: 'idle' }),
  };
}

describe('GovernorActions', () => {
  afterEach(cleanup);

  it('casts a vote via castVote when no reason variant exists', () => {
    const writes: { name: string; args: unknown[] }[] = [];
    const model = normalizeAbi(ABI);
    render(
      <GovernorActions
        model={model}
        runtime={mockRuntime((f, args) => writes.push({ name: f.name, args }))}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Vote' }));
    fireEvent.change(screen.getByPlaceholderText('proposal id'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cast vote' }));

    expect(writes).toHaveLength(1);
    expect(writes[0]!.name).toBe('castVote');
    expect(writes[0]!.args).toEqual([3n, 1]);
  });

  it('builds a proposal from the action rows', () => {
    const writes: { name: string; args: unknown[] }[] = [];
    const model = normalizeAbi(ABI);
    render(
      <GovernorActions
        model={model}
        runtime={mockRuntime((f, args) => writes.push({ name: f.name, args }))}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('What does this proposal do?'), {
      target: { value: 'Do the thing' },
    });
    fireEvent.change(screen.getByPlaceholderText('target 0x…'), {
      target: { value: '0x52908400098527886e0f7030069857d2e4169ee7' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create proposal' }));

    expect(writes).toHaveLength(1);
    expect(writes[0]!.name).toBe('propose');
    expect(writes[0]!.args).toEqual([
      ['0x52908400098527886E0F7030069857D2E4169EE7'],
      [0n],
      ['0x'],
      'Do the thing',
    ]);
  });
});
