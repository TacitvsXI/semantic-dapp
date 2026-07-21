import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { normalizeAbi } from '@semantic-dapp/spec';
import type { ContractFunction } from '@semantic-dapp/spec';
import type { FormattedOutput } from '@semantic-dapp/execution';
import { VaultActions } from './VaultActions.js';
import type { ContractRuntime } from './runtime.js';

const OWNER = '0x52908400098527886E0F7030069857D2E4169EE7' as const;

const ABI = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'totalAssets',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
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
    name: 'maxWithdraw',
    stateMutability: 'view',
    inputs: [{ name: 'a', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'previewDeposit',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256' }, { type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'redeem',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256' }, { type: 'address' }, { type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
];

function mockRuntime(
  read: (name: string, args: unknown[]) => Promise<FormattedOutput[]>,
  write: (func: ContractFunction, args: unknown[]) => void,
): ContractRuntime {
  return {
    wallet: { isConnected: true, address: OWNER, connect: () => {}, disconnect: () => {} },
    callRead: (func, args) => read(func.name, args ?? []),
    submitWrite: async (func, args) => {
      write(func, args);
    },
    getTxState: () => ({ phase: 'idle' }),
  };
}

describe('VaultActions', () => {
  afterEach(cleanup);

  it('loads vault state and submits deposit with the connected receiver', async () => {
    const reads: Record<string, string> = {
      name: 'Fixed Vault',
      symbol: 'vFIX',
      decimals: '18',
      totalAssets: '0',
      totalSupply: '0',
      balanceOf: '0',
      maxWithdraw: '0',
    };
    const read = vi.fn(async (name: string): Promise<FormattedOutput[]> => [
      { name: '', type: 'string', value: reads[name] ?? '0' },
    ]);
    const writes: { name: string; args: unknown[] }[] = [];
    const model = normalizeAbi(ABI);
    render(
      <VaultActions
        model={model}
        runtime={mockRuntime(read, (f, args) => writes.push({ name: f.name, args }))}
      />,
    );

    await waitFor(() => expect(screen.getByText('Fixed Vault')).toBeTruthy());
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Deposit' }));

    expect(writes).toHaveLength(1);
    expect(writes[0]!.name).toBe('deposit');
    expect(writes[0]!.args).toEqual([2_000_000_000_000_000_000n, OWNER]);
  });
});
