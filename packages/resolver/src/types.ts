import type { Abi, Address, Hex } from 'viem';

/** Identifier for where an ABI/source came from. */
export type AbiSourceId = 'sourcify' | 'block-explorer' | 'manual';

/** How a proxy was recognised, if at all. */
export type ProxyKind = 'eip1967-transparent' | 'eip1967-uups' | 'eip1967-beacon' | 'unknown';

export interface ContractSourceFile {
  path: string;
  content: string;
}

/** Raw result a single adapter returns on success. */
export interface ResolvedSource {
  abi: Abi;
  contractName?: string;
  compilerVersion?: string;
  sources?: ContractSourceFile[];
  /** Whether the source is verified at the origin (Sourcify/explorer). */
  verified: boolean;
  /** Sourcify match granularity, when applicable. */
  matchType?: 'full' | 'partial';
  /** Human-facing URL for the source, when available. */
  url?: string;
  /** Explorer-reported implementation address for proxies, when available. */
  proxyImplementation?: Address;
}

export type AdapterResult = { ok: true; source: ResolvedSource } | { ok: false; reason: string };

/** Minimal fetch surface so adapters are trivially testable. */
export interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}
export type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string> },
) => Promise<FetchResponse>;

export interface AdapterQuery {
  address: Address;
  chainId: number;
  apiKey?: string;
  /** Injectable fetch (defaults to global fetch). */
  fetchImpl?: FetchLike;
}

export interface AbiSourceAdapter {
  readonly id: AbiSourceId;
  readonly name: string;
  fetchContract(query: AdapterQuery): Promise<AdapterResult>;
}

/** Minimal on-chain reader used for proxy detection (viem-compatible). */
export interface ChainReader {
  getStorageAt(args: { address: Address; slot: Hex }): Promise<Hex | undefined>;
  getCode(args: { address: Address }): Promise<Hex | undefined>;
  call(args: { to: Address; data: Hex }): Promise<Hex | undefined>;
}

export interface ProxyInfo {
  isProxy: boolean;
  kind: ProxyKind;
  implementation?: Address;
  admin?: Address;
  beacon?: Address;
}

export interface Provenance {
  source: AbiSourceId;
  sourceName: string;
  verified: boolean;
  matchType?: 'full' | 'partial';
  url?: string;
  retrievedAt: number;
}

/** Final, orchestrated result for a resolved address. */
export interface ResolvedContract {
  address: Address;
  chainId: number;
  abi: Abi;
  contractName?: string;
  compilerVersion?: string;
  sources?: ContractSourceFile[];
  provenance: Provenance;
  /** 0..1 trust signal (verified full match ranks highest). */
  confidence: number;
  proxy?: ProxyInfo;
  /** keccak256 of the (implementation) bytecode, for staleness checks. */
  codeHash?: Hex;
}

export type ResolveResult =
  | { ok: true; contract: ResolvedContract }
  | { ok: false; reason: string; triedSources: AbiSourceId[] };
