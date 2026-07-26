import { keccak256, type Abi, type Address, type Hex } from 'viem';
import { sourcifyAdapter } from './adapters/sourcify.js';
import { blockExplorerAdapter } from './adapters/explorer.js';
import { mergeAbis } from './diamond.js';
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

  // On-chain proxy but implementation ABI not found: fall back to the proxy itself
  // and flag that the ABI in use is the shell, not the implementation.
  if (!found && proxyInfo && target !== address) {
    found = await tryAdapters(adapters, baseQuery(address), tried);
    if (found) {
      target = address;
      proxyInfo = { ...proxyInfo, unresolvedImplementation: true };
    }
  }

  // EIP-2535 diamond: fetch each facet ABI and merge into one call surface. The
  // diamond address stays the call target; missing facet ABIs are flagged.
  if (proxyInfo?.kind === 'eip2535-diamond' && proxyInfo.facets && proxyInfo.facets.length > 0) {
    const abis: Abi[] = [];
    let primary: Found | undefined = found && target === address ? found : undefined;
    if (primary) abis.push(primary.source.abi);

    let missing = 0;
    let resolvedFacets = 0;
    for (const facet of proxyInfo.facets) {
      if (facet.toLowerCase() === address.toLowerCase()) continue;
      const facetFound = await tryAdapters(adapters, baseQuery(facet), tried);
      if (facetFound) {
        abis.push(facetFound.source.abi);
        resolvedFacets += 1;
        if (!primary) primary = facetFound;
      } else {
        missing += 1;
      }
    }

    if (abis.length > 0 && primary) {
      // Stash the merged ABI on the found source so the common path below uses it.
      found = {
        adapter: primary.adapter,
        source: { ...primary.source, abi: mergeAbis(abis) },
      };
      proxyInfo = {
        ...proxyInfo,
        unresolvedFacets: missing > 0 || resolvedFacets === 0,
      };
    } else if (found) {
      proxyInfo = { ...proxyInfo, unresolvedFacets: true };
    }
  }

  // Proxy whose implementation we never located (e.g. beacon read failed): the ABI
  // we have is the proxy address itself, so mark it as an unresolved shell too.
  // Diamonds are handled above via unresolvedFacets — don't also flag them here.
  if (
    found &&
    proxyInfo?.isProxy &&
    target === address &&
    proxyInfo.implementation === undefined &&
    proxyInfo.kind !== 'eip2535-diamond'
  ) {
    proxyInfo = { ...proxyInfo, unresolvedImplementation: true };
  }

  if (!found) {
    return {
      ok: false,
      reason: 'No verified ABI found from any source',
      triedSources: tried,
    };
  }

  // For diamonds, hash the diamond bytecode (call target). Facet upgrades can
  // change storage without changing this hash — loupe re-query is the durable check.
  const codeHash = reader ? await codeHashOf(reader, address) : undefined;

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
