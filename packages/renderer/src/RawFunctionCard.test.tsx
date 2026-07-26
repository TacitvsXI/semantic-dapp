import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { normalizeAbi } from '@semantic-dapp/spec';
import type { WritePreview } from '@semantic-dapp/execution';
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

const AMOUNT_WRITE_ABI = [
  {
    type: 'function',
    name: 'setAmount',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
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

const TARGET = '0x1111111111111111111111111111111111111111';

function okPreview(functionName: string): WritePreview {
  return {
    to: TARGET as `0x${string}`,
    functionName,
    calldata: '0xdeadbeef' as `0x${string}`,
    success: true,
    gasEstimate: 21000n,
  };
}

function runtime(overrides?: Partial<ContractRuntime>): ContractRuntime {
  return {
    wallet: {
      isConnected: true,
      chainId: 1,
      address: '0x2222222222222222222222222222222222222222',
      connect: () => {},
      disconnect: () => {},
    },
    target: TARGET,
    callRead: async () => [],
    submitWrite: vi.fn(async () => {}),
    previewWrite: vi.fn(async () => okPreview('setThing')),
    getTxState: () => ({ phase: 'idle' }),
    ...overrides,
  };
}

async function confirmTyped() {
  await waitFor(() => expect(screen.getByTestId('confirm-proceed')).toBeTruthy());
  fireEvent.change(screen.getByLabelText('Type CONFIRM to proceed'), {
    target: { value: 'CONFIRM' },
  });
  fireEvent.click(screen.getByTestId('confirm-proceed'));
}

describe('RawFunctionCard', () => {
  it('blocks Raw write submit until a successful Preview, then confirm + typed CONFIRM', async () => {
    const submitWrite = vi.fn(async () => {});
    const previewWrite = vi.fn(async () => okPreview('setThing'));
    const func = normalizeAbi(WRITE_ABI).functions[0]!;
    render(<RawFunctionCard func={func} runtime={runtime({ submitWrite, previewWrite })} />);

    const send = screen.getByRole('button', { name: /send transaction/i }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    expect(screen.getByTestId('preview-required-hint').textContent).toMatch(/Preview required/);

    fireEvent.click(screen.getByRole('button', { name: /preview/i }));
    await waitFor(() => expect(previewWrite).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(send.disabled).toBe(false));

    fireEvent.click(send);
    expect(screen.getByTestId('safety-warnings').textContent).toContain('Unclassified / Raw');
    await confirmTyped();
    await waitFor(() => expect(submitWrite).toHaveBeenCalledTimes(1));
  });

  it('clears Preview and re-blocks Submit when inputs change', async () => {
    const submitWrite = vi.fn(async () => {});
    const previewWrite = vi.fn(async () => okPreview('setAmount'));
    const func = normalizeAbi(AMOUNT_WRITE_ABI).functions[0]!;
    render(<RawFunctionCard func={func} runtime={runtime({ submitWrite, previewWrite })} />);

    const amount = screen.getByRole('textbox');
    fireEvent.change(amount, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /preview/i }));
    await waitFor(() => expect(previewWrite).toHaveBeenCalledTimes(1));

    const send = screen.getByRole('button', { name: /send transaction/i }) as HTMLButtonElement;
    await waitFor(() => expect(send.disabled).toBe(false));
    expect(screen.getByText(/would succeed/i)).toBeTruthy();

    fireEvent.change(amount, { target: { value: '2' } });
    await waitFor(() => expect(send.disabled).toBe(true));
    expect(screen.queryByText(/would succeed/i)).toBeNull();
    expect(screen.getByTestId('preview-required-hint')).toBeTruthy();
    expect(submitWrite).not.toHaveBeenCalled();
  });

  it('does not require confirm or preview for Raw reads', async () => {
    const callRead = vi.fn(async () => [{ name: '', type: 'uint256', value: '1' }]);
    const func = normalizeAbi(READ_ABI).functions[0]!;
    render(
      <RawFunctionCard func={func} runtime={runtime({ callRead, previewWrite: undefined })} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /call/i }));
    await waitFor(() => expect(callRead).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('confirm-proceed')).toBeNull();
    expect(screen.queryByTestId('preview-required-hint')).toBeNull();
  });
});
