import { describe, it, expect } from 'vitest';
import { encodeAbiParameters, getAddress, type Address, type Hex } from 'viem';
import { resolveContract } from './resolve.js';
import { EIP1967_IMPLEMENTATION_SLOT } from './proxy.js';
import { FACET_ADDRESSES_SELECTOR } from './diamond.js';
import type {
  AbiSourceAdapter,
  AbiSourceId,
  AdapterQuery,
  AdapterResult,
  ChainReader,
  ResolvedSource,
} from './types.js';

const ABI = [
  { type: 'function', name: 'foo', inputs: [], outputs: [], stateMutability: 'view' },
] as unknown as ResolvedSource['abi'];

const ADDRESS = getAddress('0x1111111111111111111111111111111111111111');
const IMPL = getAddress('0x2222222222222222222222222222222222222222');
const ZERO_WORD: Hex = `0x${'0'.repeat(64)}`;

function word(address: Address): Hex {
  return `0x${'0'.repeat(24)}${address.toLowerCase().replace(/^0x/, '')}` as Hex;
}

function fakeAdapter(
  id: AbiSourceId,
  name: string,
  handler: (query: AdapterQuery) => AdapterResult,
): AbiSourceAdapter {
  return { id, name, fetchContract: async (query) => handler(query) };
}

const miss = (): AdapterResult => ({ ok: false, reason: 'not found' });
const hit = (source: Partial<ResolvedSource> = {}): AdapterResult => ({
  ok: true,
  source: { abi: ABI, verified: true, ...source },
});

describe('resolveContract', () => {
  it('uses the first adapter that succeeds (trust order)', async () => {
    const adapters = [
      fakeAdapter('sourcify', 'Sourcify', miss),
      fakeAdapter('block-explorer', 'Etherscan', () => hit()),
    ];
    const result = await resolveContract({ address: ADDRESS, chainId: 1, adapters });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.contract.provenance.source).toBe('block-explorer');
  });

  it('scores a Sourcify full match highest', async () => {
    const adapters = [fakeAdapter('sourcify', 'Sourcify', () => hit({ matchType: 'full' }))];
    const result = await resolveContract({ address: ADDRESS, chainId: 1, adapters });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.contract.confidence).toBe(0.95);
      expect(result.contract.provenance.matchType).toBe('full');
    }
  });

  it('follows an on-chain proxy to its implementation', async () => {
    const reader: ChainReader = {
      getStorageAt: async ({ slot }) =>
        slot === EIP1967_IMPLEMENTATION_SLOT ? word(IMPL) : ZERO_WORD,
      getCode: async () => '0xabcdef',
      call: async () => undefined,
    };
    const seen: Address[] = [];
    const adapters = [
      fakeAdapter('sourcify', 'Sourcify', (q) => {
        seen.push(q.address);
        return q.address === IMPL ? hit({ contractName: 'Impl' }) : miss();
      }),
    ];
    const result = await resolveContract({ address: ADDRESS, chainId: 1, reader, adapters });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.contract.proxy?.isProxy).toBe(true);
      expect(result.contract.proxy?.implementation).toBe(IMPL);
      expect(result.contract.contractName).toBe('Impl');
      expect(result.contract.codeHash).toBeDefined();
      expect(seen).toContain(IMPL);
    }
  });

  it('follows an explorer-reported proxy implementation', async () => {
    const adapters = [
      fakeAdapter('block-explorer', 'Etherscan', (q) =>
        q.address === ADDRESS
          ? hit({ proxyImplementation: IMPL, contractName: 'Proxy' })
          : hit({ contractName: 'Impl' }),
      ),
    ];
    const result = await resolveContract({ address: ADDRESS, chainId: 1, adapters });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.contract.contractName).toBe('Impl');
      expect(result.contract.proxy?.implementation).toBe(IMPL);
    }
  });

  it('fails with tried sources when nothing verified is found', async () => {
    const adapters = [
      fakeAdapter('sourcify', 'Sourcify', miss),
      fakeAdapter('block-explorer', 'Etherscan', miss),
    ];
    const result = await resolveContract({ address: ADDRESS, chainId: 1, adapters });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.triedSources).toEqual(['sourcify', 'block-explorer']);
    }
  });

  it('merges facet ABIs for an EIP-2535 diamond', async () => {
    const facetA = getAddress('0x3333333333333333333333333333333333333333');
    const facetB = getAddress('0x4444444444444444444444444444444444444444');
    const encoded = encodeAbiParameters([{ type: 'address[]' }], [[facetA, facetB]]);
    const reader: ChainReader = {
      getStorageAt: async () => ZERO_WORD,
      getCode: async ({ address }) =>
        address === facetA || address === facetB || address === ADDRESS ? '0xabcdef' : '0x',
      call: async ({ data }) => (data.startsWith(FACET_ADDRESSES_SELECTOR) ? encoded : undefined),
    };

    const shellAbi = [
      {
        type: 'function',
        name: 'facetAddresses',
        inputs: [],
        outputs: [{ type: 'address[]' }],
        stateMutability: 'view',
      },
    ] as unknown as ResolvedSource['abi'];
    const facetAAbi = [
      {
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
        stateMutability: 'nonpayable',
      },
    ] as unknown as ResolvedSource['abi'];
    const facetBAbi = [
      {
        type: 'function',
        name: 'mint',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
      },
    ] as unknown as ResolvedSource['abi'];

    const adapters = [
      fakeAdapter('sourcify', 'Sourcify', (q) => {
        if (q.address === ADDRESS) return hit({ abi: shellAbi, contractName: 'Diamond' });
        if (q.address === facetA) return hit({ abi: facetAAbi, contractName: 'TransferFacet' });
        if (q.address === facetB) return hit({ abi: facetBAbi, contractName: 'MintFacet' });
        return miss();
      }),
    ];

    const result = await resolveContract({ address: ADDRESS, chainId: 1, reader, adapters });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.contract.proxy?.kind).toBe('eip2535-diamond');
      expect(result.contract.proxy?.facets).toEqual([facetA, facetB]);
      expect(result.contract.proxy?.unresolvedFacets).toBe(false);
      const names = result.contract.abi
        .filter((i) => i.type === 'function')
        .map((i) => (i as { name: string }).name)
        .sort();
      expect(names).toEqual(['facetAddresses', 'mint', 'transfer']);
      // Call target stays the diamond.
      expect(result.contract.address).toBe(ADDRESS);
    }
  });

  it('flags unresolvedFacets when a facet ABI is missing', async () => {
    const facetA = getAddress('0x3333333333333333333333333333333333333333');
    const facetB = getAddress('0x4444444444444444444444444444444444444444');
    const encoded = encodeAbiParameters([{ type: 'address[]' }], [[facetA, facetB]]);
    const reader: ChainReader = {
      getStorageAt: async () => ZERO_WORD,
      getCode: async () => '0xabcdef',
      call: async ({ data }) => (data.startsWith(FACET_ADDRESSES_SELECTOR) ? encoded : undefined),
    };
    const adapters = [
      fakeAdapter('sourcify', 'Sourcify', (q) => {
        if (q.address === ADDRESS) return hit({ contractName: 'Diamond' });
        if (q.address === facetA) return hit({ contractName: 'TransferFacet' });
        return miss(); // facetB missing
      }),
    ];
    const result = await resolveContract({ address: ADDRESS, chainId: 1, reader, adapters });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.contract.proxy?.unresolvedFacets).toBe(true);
    }
  });
});
