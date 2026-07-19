import { keccak256, type Address, type Hex } from 'viem';
import { sourcifyAdapter } from './adapters/sourcify.js';
import { blockExplorerAdapter } from './adapters/explorer.js';
import { detectProxy } from './proxy.js';
import type {
  AbiSourceAdapter,
  AbiSourceId,
  AdapterQuery,
  ChainReader,
  Provenance,
  ProxyInfo,
  ResolvedContract,
  ResolvedSource,
  ResolveResult,
  FetchLike,
} from './types.js';

export interface ResolveOptions {
  address: Address;
  chainId: number;
  /** Optional on-chain reader for proxy detection + code hash (viem-compatible). */
  reader?: ChainReader;
  /** Explorer API key (optional; recommended for the block-explorer adapter). */
  apiKey?: string;
  /** Injectable fetch (defaults to global fetch). */
  fetchImpl?: FetchLike;
  /** Override adapter order (default: Sourcify, then block explorer). */
  adapters?: AbiSourceAdapter[];
}

const DEFAULT_ADAPTERS: AbiSourceAdapter[] = [sourcifyAdapter, blockExplorerAdapter];

interface Found {
  adapter: AbiSourceAdapter;
  source: ResolvedSource;
}

function scoreConfidence(source: ResolvedSource): number {
  if (!source.verified) return 0.4;
  if (source.matchType === 'full') return 0.95;
  if (source.matchType === 'partial') return 0.85;
  return 0.9;
}

async function tryAdapters(
  adapters: AbiSourceAdapter[],
  query: AdapterQuery,
  tried: AbiSourceId[],
): Promise<Found | undefined> {
  for (const adapter of adapters) {
    if (!tried.includes(adapter.id)) tried.push(adapter.id);
    const result = await adapter.fetchContract(query);
    if (result.ok) return { adapter, source: result.source };
  }
  return undefined;
}

async function safeDetectProxy(
  reader: ChainReader,
  address: Address,
): Promise<ProxyInfo | undefined> {
  try {
    const proxy = await detectProxy(reader, address);
    return proxy.isProxy ? proxy : undefined;
  } catch {
    return undefined;
  }
}

async function codeHashOf(reader: ChainReader, address: Address): Promise<Hex | undefined> {
  try {
    const code = await reader.getCode({ address });
    if (code && code !== '0x') return keccak256(code);
  } catch {
    /* best-effort */
  }
  return undefined;
}

/**
 * Resolve an ABI/source for a contract address by trying source adapters in
 * trust order, following proxies to their implementation, and attaching
 * provenance + a confidence signal. Returns a typed failure when nothing
 * verified is found so callers can fall back to manual paste.
 */
export async function resolveContract(options: ResolveOptions): Promise<ResolveResult> {
  const { address, chainId, reader, apiKey, fetchImpl } = options;
  const adapters = options.adapters ?? DEFAULT_ADAPTERS;
  const tried: AbiSourceId[] = [];

  const baseQuery = (target: Address): AdapterQuery => ({
    address: target,
    chainId,
    ...(apiKey ? { apiKey } : {}),
    ...(fetchImpl ? { fetchImpl } : {}),
  });

  let proxyInfo = reader ? await safeDetectProxy(reader, address) : undefined;
  let target: Address = proxyInfo?.implementation ?? address;

  let found = await tryAdapters(adapters, baseQuery(target), tried);

  // Follow an explorer-reported proxy implementation, if any.
  if (found?.source.proxyImplementation && found.source.proxyImplementation !== target) {
    const implAddr = found.source.proxyImplementation;
    const implFound = await tryAdapters(adapters, baseQuery(implAddr), tried);
    if (implFound) {
      proxyInfo = proxyInfo
        ? { ...proxyInfo, implementation: implAddr }
        : { isProxy: true, kind: 'unknown', implementation: implAddr };
      target = implAddr;
      found = implFound;
    }
  }

  // On-chain proxy but implementation ABI not found: fall back to the proxy itself.
  if (!found && proxyInfo && target !== address) {
    found = await tryAdapters(adapters, baseQuery(address), tried);
    if (found) target = address;
  }

  if (!found) {
    return {
      ok: false,
      reason: 'No verified ABI found from any source',
      triedSources: tried,
    };
  }

  const codeHash = reader ? await codeHashOf(reader, target) : undefined;

  const provenance: Provenance = {
    source: found.adapter.id,
    sourceName: found.adapter.name,
    verified: found.source.verified,
    ...(found.source.matchType ? { matchType: found.source.matchType } : {}),
    ...(found.source.url ? { url: found.source.url } : {}),
    retrievedAt: Date.now(),
  };

  const contract: ResolvedContract = {
    address,
    chainId,
    abi: found.source.abi,
    provenance,
    confidence: scoreConfidence(found.source),
    ...(found.source.contractName ? { contractName: found.source.contractName } : {}),
    ...(found.source.compilerVersion ? { compilerVersion: found.source.compilerVersion } : {}),
    ...(found.source.sources ? { sources: found.source.sources } : {}),
    ...(proxyInfo ? { proxy: proxyInfo } : {}),
    ...(codeHash ? { codeHash } : {}),
  };

  return { ok: true, contract };
}
