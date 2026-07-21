import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { normalizeAbi } from '@semantic-dapp/spec';
import type { FormattedOutput } from '@semantic-dapp/execution';
import { ReadDataGrid, noArgReads } from './ReadDataGrid.js';
import type { ContractRuntime } from './runtime.js';

const ABI = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'a', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
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
];

function mockRuntime(read: (name: string) => Promise<FormattedOutput[]>): ContractRuntime {
  return {
    wallet: { isConnected: false, connect: () => {}, disconnect: () => {} },
    callRead: (func) => read(func.name),
    submitWrite: async () => {},
    getTxState: () => ({ phase: 'idle' }),
  };
}

describe('noArgReads', () => {
  it('selects only zero-argument view/pure getters', () => {
    const model = normalizeAbi(ABI);
    const names = noArgReads(model)
      .map((f) => f.name)
      .sort();
    expect(names).toEqual(['name', 'paused', 'symbol']);
  });
});

describe('ReadDataGrid', () => {
  afterEach(cleanup);

  it('auto-calls every no-arg getter and shows the values', async () => {
    const values: Record<string, string> = { name: 'My Token', symbol: 'MTK', paused: 'false' };
    const read = vi.fn(async (name: string): Promise<FormattedOutput[]> => [
      { name: '', type: 'string', value: values[name] ?? '' },
    ]);
    const model = normalizeAbi(ABI);
    render(<ReadDataGrid model={model} runtime={mockRuntime(read)} />);

    await waitFor(() => expect(screen.getByText('My Token')).toBeTruthy());
    expect(screen.getByText('MTK')).toBeTruthy();
    expect(screen.getByText('false')).toBeTruthy();
    // Only the three no-arg getters were called, not balanceOf/transfer.
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('shows a per-cell failure when a read rejects', async () => {
    const read = vi.fn(async (name: string): Promise<FormattedOutput[]> => {
      if (name === 'symbol') throw new Error('boom');
      return [{ name: '', type: 'string', value: 'ok' }];
    });
    const model = normalizeAbi(ABI);
    render(<ReadDataGrid model={model} runtime={mockRuntime(read)} />);

    await waitFor(() => expect(screen.getByText('failed')).toBeTruthy());
  });

  it('renders nothing when there are no no-arg getters', () => {
    const onlyParametrized = normalizeAbi([
      {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'a', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ]);
    const { container } = render(
      <ReadDataGrid model={onlyParametrized} runtime={mockRuntime(async () => [])} />,
    );
    expect(container.querySelector('.sd-readgrid')).toBeNull();
  });
});
