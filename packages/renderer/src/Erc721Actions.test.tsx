import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { normalizeAbi } from '@semantic-dapp/spec';
import type { FormattedOutput } from '@semantic-dapp/execution';
import { Erc721Actions } from './Erc721Actions.js';
import type { ContractRuntime } from './runtime.js';

const OWNER = '0x52908400098527886E0F7030069857D2E4169EE7';

const ABI = [
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ type: 'string' }],
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
    name: 'tokenOfOwnerByIndex',
    stateMutability: 'view',
    inputs: [
      { name: 'a', type: 'address' },
      { name: 'i', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
];

function mockRuntime(read: (name: string, args: unknown[]) => string | undefined): ContractRuntime {
  return {
    wallet: { isConnected: true, address: OWNER, connect: () => {}, disconnect: () => {} },
    callRead: async (func, args): Promise<FormattedOutput[]> => {
      const value = read(func.name, args ?? []);
      return value === undefined ? [] : [{ name: '', type: 'string', value }];
    },
    submitWrite: async () => {},
    getTxState: () => ({ phase: 'idle' }),
  };
}

describe('Erc721Actions', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ name: 'Punk #1', image: 'ipfs://QmImg/1.png' }),
      })),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('enumerates the owner tokens and resolves metadata', async () => {
    const read = (name: string): string | undefined => {
      if (name === 'balanceOf') return '1';
      if (name === 'tokenOfOwnerByIndex') return '1';
      if (name === 'ownerOf') return OWNER;
      if (name === 'tokenURI') return 'ipfs://QmMeta/1.json';
      return undefined;
    };
    const model = normalizeAbi(ABI);
    render(<Erc721Actions model={model} runtime={mockRuntime(read)} />);

    await waitFor(() => expect(screen.getByText('Punk #1')).toBeTruthy());
    // The image was gateway-resolved from ipfs://.
    const img = screen.getByAltText('Punk #1') as HTMLImageElement;
    expect(img.src).toBe('https://ipfs.io/ipfs/QmImg/1.png');
  });
});
