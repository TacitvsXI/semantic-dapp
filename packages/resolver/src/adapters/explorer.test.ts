import { describe, it, expect } from 'vitest';
import { getAddress } from 'viem';
import { blockExplorerAdapter } from './explorer.js';
import type { FetchLike, FetchResponse } from '../types.js';

const ABI = [{ type: 'function', name: 'foo', inputs: [], outputs: [], stateMutability: 'view' }];
const ADDRESS = getAddress('0x1111111111111111111111111111111111111111');
const IMPL = getAddress('0x2222222222222222222222222222222222222222');

function res(body: unknown): FetchResponse {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function fetchReturning(body: unknown): FetchLike {
  return async () => res(body);
}

describe('blockExplorerAdapter', () => {
  it('resolves a verified contract', async () => {
    const fetchImpl = fetchReturning({
      status: '1',
      message: 'OK',
      result: [
        {
          ABI: JSON.stringify(ABI),
          ContractName: 'Foo',
          CompilerVersion: 'v0.8.20',
          Proxy: '0',
        },
      ],
    });
    const result = await blockExplorerAdapter.fetchContract({
      address: ADDRESS,
      chainId: 1,
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source.verified).toBe(true);
      expect(result.source.contractName).toBe('Foo');
      expect(result.source.proxyImplementation).toBeUndefined();
    }
  });

  it('reports a proxy implementation hint', async () => {
    const fetchImpl = fetchReturning({
      status: '1',
      result: [{ ABI: JSON.stringify(ABI), Proxy: '1', Implementation: IMPL }],
    });
    const result = await blockExplorerAdapter.fetchContract({
      address: ADDRESS,
      chainId: 1,
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source.proxyImplementation).toBe(IMPL);
  });

  it('fails for an unverified contract', async () => {
    const fetchImpl = fetchReturning({
      status: '0',
      message: 'NOTOK',
      result: [{ ABI: 'Contract source code not verified' }],
    });
    const result = await blockExplorerAdapter.fetchContract({
      address: ADDRESS,
      chainId: 1,
      fetchImpl,
    });
    expect(result.ok).toBe(false);
  });
});
