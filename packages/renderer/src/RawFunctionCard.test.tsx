import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { normalizeAbi } from '@semantic-dapp/spec';
import { RawFunctionCard } from './OperationCard.js';
import type { ContractRuntime } from './runtime.js';

afterEach(cleanup);

const WRITE_ABI = [
  {
    type: 'function',
    name: 'setThing',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
];

const READ_ABI = [
  {
    type: 'function',
    name: 'thing',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

function runtime(overrides?: Partial<ContractRuntime>): ContractRuntime {
  return {
    wallet: { isConnected: true, chainId: 1, connect: () => {}, disconnect: () => {} },
    callRead: async () => [],
    submitWrite: vi.fn(async () => {}),
    getTxState: () => ({ phase: 'idle' }),
    ...overrides,
  };
}

describe('RawFunctionCard', () => {
  it('gates Raw writes behind confirm + typed CONFIRM', async () => {
    const submitWrite = vi.fn(async () => {});
    const func = normalizeAbi(WRITE_ABI).functions[0]!;
    render(<RawFunctionCard func={func} runtime={runtime({ submitWrite })} />);

    fireEvent.click(screen.getByRole('button', { name: /send transaction/i }));

    await waitFor(() => expect(screen.getByTestId('confirm-proceed')).toBeTruthy());
    expect(screen.getByTestId('safety-warnings').textContent).toContain('Unclassified / Raw');
    expect(screen.getAllByText(/high risk/i).length).toBeGreaterThanOrEqual(1);

    const proceed = screen.getByTestId('confirm-proceed') as HTMLButtonElement;
    expect(proceed.disabled).toBe(true);
    fireEvent.click(proceed);
    expect(submitWrite).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Type CONFIRM to proceed'), {
      target: { value: 'CONFIRM' },
    });
    expect(proceed.disabled).toBe(false);
    fireEvent.click(proceed);

    await waitFor(() => expect(submitWrite).toHaveBeenCalledTimes(1));
  });

  it('does not require confirm for Raw reads', async () => {
    const callRead = vi.fn(async () => [{ name: '', type: 'uint256', value: '1' }]);
    const func = normalizeAbi(READ_ABI).functions[0]!;
    render(<RawFunctionCard func={func} runtime={runtime({ callRead })} />);

    fireEvent.click(screen.getByRole('button', { name: /call/i }));
    await waitFor(() => expect(callRead).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('confirm-proceed')).toBeNull();
  });
});
