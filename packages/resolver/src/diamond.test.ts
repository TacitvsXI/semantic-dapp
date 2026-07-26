import { describe, it, expect } from 'vitest';
import { encodeAbiParameters, getAddress, type Abi, type Address, type Hex } from 'viem';
import { enumerateDiamondFacets, FACET_ADDRESSES_SELECTOR, mergeAbis } from './diamond.js';
import type { ChainReader } from './types.js';

const DIAMOND: Address = getAddress('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
const FACET_A: Address = getAddress('0x1111111111111111111111111111111111111111');
const FACET_B: Address = getAddress('0x2222222222222222222222222222222222222222');

function encodeAddresses(addrs: Address[]): Hex {
  return encodeAbiParameters([{ type: 'address[]' }], [addrs]);
}

describe('enumerateDiamondFacets', () => {
  it('returns facet addresses that have code', async () => {
    const reader: ChainReader = {
      getStorageAt: async () => undefined,
      getCode: async ({ address }) =>
        address === FACET_A || address === FACET_B ? '0xabcdef' : '0x',
      call: async ({ data }) =>
        data === FACET_ADDRESSES_SELECTOR ? encodeAddresses([FACET_A, FACET_B]) : undefined,
    };
    const facets = await enumerateDiamondFacets(reader, DIAMOND);
    expect(facets).toEqual([FACET_A, FACET_B]);
  });

  it('returns undefined when loupe reverts / is empty', async () => {
    const reader: ChainReader = {
      getStorageAt: async () => undefined,
      getCode: async () => '0xabcdef',
      call: async () => {
        throw new Error('revert');
      },
    };
    expect(await enumerateDiamondFacets(reader, DIAMOND)).toBeUndefined();
  });

  it('returns undefined when facets have no code (false-positive guard)', async () => {
    const reader: ChainReader = {
      getStorageAt: async () => undefined,
      getCode: async () => '0x',
      call: async () => encodeAddresses([FACET_A]),
    };
    expect(await enumerateDiamondFacets(reader, DIAMOND)).toBeUndefined();
  });
});

describe('mergeAbis', () => {
  it('dedupes functions by selector and unions events', () => {
    const a = [
      {
        type: 'function',
        name: 'foo',
        inputs: [],
        outputs: [],
        stateMutability: 'view',
      },
      {
        type: 'event',
        name: 'Foo',
        inputs: [{ name: 'x', type: 'uint256', indexed: false }],
      },
    ] as const;
    const b = [
      {
        type: 'function',
        name: 'foo',
        inputs: [],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'bar',
        inputs: [{ name: 'to', type: 'address' }],
        outputs: [],
        stateMutability: 'nonpayable',
      },
      {
        type: 'event',
        name: 'Bar',
        inputs: [],
      },
    ] as const;

    const merged = mergeAbis([a as unknown as Abi, b as unknown as Abi]);
    const fnNames = merged
      .filter((i) => i.type === 'function')
      .map((i) => (i as { name: string }).name);
    const evNames = merged
      .filter((i) => i.type === 'event')
      .map((i) => (i as { name: string }).name);
    expect(fnNames).toEqual(['foo', 'bar']);
    expect(evNames.sort()).toEqual(['Bar', 'Foo']);
  });
});
