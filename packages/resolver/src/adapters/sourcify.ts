import { getAddress } from 'viem';
import { parseAbi } from '@semantic-dapp/spec';
import type { AbiSourceAdapter, AdapterQuery, AdapterResult, FetchLike } from '../types.js';

const REPO_BASE = 'https://repo.sourcify.dev/contracts';

interface SolidityMetadata {
  compiler?: { version?: string };
  output?: { abi?: unknown };
  settings?: { compilationTarget?: Record<string, string> };
}

function contractNameFromMetadata(meta: SolidityMetadata): string | undefined {
  const target = meta.settings?.compilationTarget;
  if (!target) return undefined;
  const names = Object.values(target);
  return names[0];
}

async function tryMatch(
  fetchImpl: FetchLike,
  chainId: number,
  address: string,
  match: 'full_match' | 'partial_match',
): Promise<AdapterResult | undefined> {
  const url = `${REPO_BASE}/${match}/${chainId}/${address}/metadata.json`;
  let response;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    return { ok: false, reason: `Sourcify request failed: ${(error as Error).message}` };
  }
  if (response.status === 404) return undefined;
  if (!response.ok) return { ok: false, reason: `Sourcify HTTP ${response.status}` };

  let meta: SolidityMetadata;
  try {
    meta = (await response.json()) as SolidityMetadata;
  } catch (error) {
    return { ok: false, reason: `Sourcify returned invalid JSON: ${(error as Error).message}` };
  }

  const parsed = parseAbi(meta.output?.abi);
  if (!parsed.success || !parsed.abi) {
    return { ok: false, reason: `Sourcify metadata has no usable ABI: ${parsed.error ?? ''}` };
  }

  const name = contractNameFromMetadata(meta);
  return {
    ok: true,
    source: {
      abi: parsed.abi,
      verified: true,
      matchType: match === 'full_match' ? 'full' : 'partial',
      url: `${REPO_BASE}/${match}/${chainId}/${address}/`,
      ...(name ? { contractName: name } : {}),
      ...(meta.compiler?.version ? { compilerVersion: meta.compiler.version } : {}),
    },
  };
}

/** Resolve verified metadata from Sourcify (no API key required). */
export const sourcifyAdapter: AbiSourceAdapter = {
  id: 'sourcify',
  name: 'Sourcify',
  async fetchContract(query: AdapterQuery): Promise<AdapterResult> {
    const fetchImpl = query.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    if (!fetchImpl) return { ok: false, reason: 'No fetch implementation available' };

    // Sourcify repo paths use checksummed addresses.
    const address = getAddress(query.address);

    const full = await tryMatch(fetchImpl, query.chainId, address, 'full_match');
    if (full) return full;

    const partial = await tryMatch(fetchImpl, query.chainId, address, 'partial_match');
    if (partial) return partial;

    return { ok: false, reason: 'Contract not found on Sourcify (full or partial match)' };
  },
};
