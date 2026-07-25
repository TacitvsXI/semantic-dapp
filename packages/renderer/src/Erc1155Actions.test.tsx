import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { normalizeAbi } from '@semantic-dapp/spec';
import type { ContractFunction } from '@semantic-dapp/spec';
import { Erc1155Actions } from './Erc1155Actions.js';
import type { ContractRuntime } from './runtime.js';

const OWNER = '0x52908400098527886E0F7030069857D2E4169EE7' as const;
const RECIPIENT = '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe';

const ABI = [
  {
    type: 'function',
    name: 'safeBatchTransferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
];

function mockRuntime(write: (func: ContractFunction, args: unknown[]) => void): ContractRuntime {
  return {
    wallet: { isConnected: true, address: OWNER, connect: () => {}, disconnect: () => {} },
    callRead: async () => [],
    submitWrite: async (func, args) => {
      write(func, args);
    },
    getTxState: () => ({ phase: 'idle' }),
  };
}

describe('Erc1155Actions', () => {
  afterEach(cleanup);

  it('submits safeBatchTransferFrom with the connected account as sender', () => {
    const writes: { name: string; args: unknown[] }[] = [];
    const model = normalizeAbi(ABI);
    render(
      <Erc1155Actions
        model={model}
        runtime={mockRuntime((f, args) => writes.push({ name: f.name, args }))}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('0x…'), { target: { value: RECIPIENT } });
    fireEvent.change(screen.getByPlaceholderText('id'), { target: { value: '7' } });
    fireEvent.change(screen.getByPlaceholderText('amount'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Transfer 1 token/ }));

    expect(writes).toHaveLength(1);
    expect(writes[0]!.name).toBe('safeBatchTransferFrom');
    expect(writes[0]!.args).toEqual([
      OWNER,
      '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe',
      [7n],
      [2n],
      '0x',
    ]);
  });
});
