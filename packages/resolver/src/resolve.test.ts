import { describe, it, expect } from 'vitest';
import { getAddress, type Address, type Hex } from 'viem';
import { resolveContract } from './resolve.js';
import { EIP1967_IMPLEMENTATION_SLOT } from './proxy.js';
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
});
