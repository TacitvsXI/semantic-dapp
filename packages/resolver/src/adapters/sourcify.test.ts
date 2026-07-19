import { describe, it, expect } from 'vitest';
import { getAddress } from 'viem';
import { sourcifyAdapter } from './sourcify.js';
import type { FetchLike, FetchResponse } from '../types.js';

const ABI = [{ type: 'function', name: 'foo', inputs: [], outputs: [], stateMutability: 'view' }];

const ADDRESS = getAddress('0x1111111111111111111111111111111111111111');

function res(status: number, body: unknown): FetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const metadata = {
  compiler: { version: 'v0.8.20+commit.abc' },
  output: { abi: ABI },
  settings: { compilationTarget: { 'src/Foo.sol': 'Foo' } },
};

function fetchFor(map: Record<string, FetchResponse>): FetchLike {
  return async (url: string) => map[url] ?? res(404, {});
}

describe('sourcifyAdapter', () => {
  it('resolves a full match', async () => {
    const fetchImpl = fetchFor({
      [`https://repo.sourcify.dev/contracts/full_match/1/${ADDRESS}/metadata.json`]: res(
        200,
        metadata,
      ),
    });
    const result = await sourcifyAdapter.fetchContract({ address: ADDRESS, chainId: 1, fetchImpl });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source.verified).toBe(true);
      expect(result.source.matchType).toBe('full');
      expect(result.source.contractName).toBe('Foo');
      expect(result.source.compilerVersion).toBe('v0.8.20+commit.abc');
      expect(result.source.abi).toHaveLength(1);
    }
  });

  it('falls back to a partial match', async () => {
    const fetchImpl = fetchFor({
      [`https://repo.sourcify.dev/contracts/partial_match/1/${ADDRESS}/metadata.json`]: res(
        200,
        metadata,
      ),
    });
    const result = await sourcifyAdapter.fetchContract({ address: ADDRESS, chainId: 1, fetchImpl });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source.matchType).toBe('partial');
  });

  it('fails when neither match exists', async () => {
    const fetchImpl = fetchFor({});
    const result = await sourcifyAdapter.fetchContract({ address: ADDRESS, chainId: 1, fetchImpl });
    expect(result.ok).toBe(false);
  });
});
