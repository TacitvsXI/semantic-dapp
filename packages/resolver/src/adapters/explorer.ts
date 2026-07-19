import { getAddress, isAddress } from 'viem';
import { parseAbiJson } from '@semantic-dapp/spec';
import type { AbiSourceAdapter, AdapterQuery, AdapterResult, FetchLike } from '../types.js';

/** Etherscan v2 unified multichain endpoint. */
const ETHERSCAN_V2_BASE = 'https://api.etherscan.io/v2/api';

const NOT_VERIFIED = 'Contract source code not verified';

interface EtherscanResponse {
  status?: string;
  message?: string;
  result?: unknown;
}

interface SourceCodeEntry {
  SourceCode?: string;
  ABI?: string;
  ContractName?: string;
  CompilerVersion?: string;
  Proxy?: string;
  Implementation?: string;
}

/**
 * Resolve a verified ABI from an Etherscan-family explorer via the v2 unified
 * API. An API key is optional but strongly recommended (unauthenticated calls
 * are heavily rate-limited).
 */
export const blockExplorerAdapter: AbiSourceAdapter = {
  id: 'block-explorer',
  name: 'Etherscan (v2)',
  async fetchContract(query: AdapterQuery): Promise<AdapterResult> {
    const fetchImpl = query.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    if (!fetchImpl) return { ok: false, reason: 'No fetch implementation available' };

    const address = getAddress(query.address);
    const params = new URLSearchParams({
      chainid: String(query.chainId),
      module: 'contract',
      action: 'getsourcecode',
      address,
    });
    if (query.apiKey) params.set('apikey', query.apiKey);

    let response;
    try {
      response = await fetchImpl(`${ETHERSCAN_V2_BASE}?${params.toString()}`);
    } catch (error) {
      return { ok: false, reason: `Explorer request failed: ${(error as Error).message}` };
    }
    if (!response.ok) return { ok: false, reason: `Explorer HTTP ${response.status}` };

    let body: EtherscanResponse;
    try {
      body = (await response.json()) as EtherscanResponse;
    } catch (error) {
      return { ok: false, reason: `Explorer returned invalid JSON: ${(error as Error).message}` };
    }

    if (body.status !== '1' || !Array.isArray(body.result) || body.result.length === 0) {
      return { ok: false, reason: `Explorer: ${body.message ?? 'no result'}` };
    }

    const entry = body.result[0] as SourceCodeEntry;
    if (!entry.ABI || entry.ABI === NOT_VERIFIED) {
      return { ok: false, reason: 'Contract source is not verified on the explorer' };
    }

    const parsed = parseAbiJson(entry.ABI);
    if (!parsed.success || !parsed.abi) {
      return { ok: false, reason: `Explorer ABI is invalid: ${parsed.error ?? ''}` };
    }

    const proxyImplementation =
      entry.Proxy === '1' && entry.Implementation && isAddress(entry.Implementation)
        ? getAddress(entry.Implementation)
        : undefined;

    return {
      ok: true,
      source: {
        abi: parsed.abi,
        verified: true,
        ...(entry.ContractName ? { contractName: entry.ContractName } : {}),
        ...(entry.CompilerVersion ? { compilerVersion: entry.CompilerVersion } : {}),
        ...(proxyImplementation ? { proxyImplementation } : {}),
      },
    };
  },
};
