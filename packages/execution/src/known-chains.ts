/**
 * A small, offline registry of well-known EVM chains: their display name, native
 * currency and block-explorer base URL. Used to enrich a chain configuration
 * (so the generated UI can link addresses/transactions to an explorer) without
 * bundling a heavy chain database. Unknown chains simply fall back to sensible
 * defaults and no explorer link.
 */
export interface KnownChain {
  id: number;
  name: string;
  /** Block-explorer base URL, no trailing slash (e.g. `https://etherscan.io`). */
  explorerUrl?: string;
  nativeCurrency?: { name: string; symbol: string; decimals: number };
}

const ETH = { name: 'Ether', symbol: 'ETH', decimals: 18 } as const;

export const KNOWN_CHAINS: Record<number, KnownChain> = {
  1: { id: 1, name: 'Ethereum', explorerUrl: 'https://etherscan.io', nativeCurrency: ETH },
  11155111: {
    id: 11155111,
    name: 'Sepolia',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  },
  17000: {
    id: 17000,
    name: 'Holesky',
    explorerUrl: 'https://holesky.etherscan.io',
    nativeCurrency: { name: 'Holesky Ether', symbol: 'ETH', decimals: 18 },
  },
  8453: { id: 8453, name: 'Base', explorerUrl: 'https://basescan.org', nativeCurrency: ETH },
  84532: {
    id: 84532,
    name: 'Base Sepolia',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: ETH,
  },
  10: {
    id: 10,
    name: 'OP Mainnet',
    explorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: ETH,
  },
  11155420: {
    id: 11155420,
    name: 'OP Sepolia',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    nativeCurrency: ETH,
  },
  42161: {
    id: 42161,
    name: 'Arbitrum One',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: ETH,
  },
  421614: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    explorerUrl: 'https://sepolia.arbiscan.io',
    nativeCurrency: ETH,
  },
  137: {
    id: 137,
    name: 'Polygon',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  },
  56: {
    id: 56,
    name: 'BNB Smart Chain',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  },
  43114: {
    id: 43114,
    name: 'Avalanche',
    explorerUrl: 'https://snowtrace.io',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
  },
  100: {
    id: 100,
    name: 'Gnosis',
    explorerUrl: 'https://gnosisscan.io',
    nativeCurrency: { name: 'xDAI', symbol: 'XDAI', decimals: 18 },
  },
  42220: {
    id: 42220,
    name: 'Celo',
    explorerUrl: 'https://celoscan.io',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  },
  324: {
    id: 324,
    name: 'zkSync Era',
    explorerUrl: 'https://explorer.zksync.io',
    nativeCurrency: ETH,
  },
  59144: { id: 59144, name: 'Linea', explorerUrl: 'https://lineascan.build', nativeCurrency: ETH },
  534352: {
    id: 534352,
    name: 'Scroll',
    explorerUrl: 'https://scrollscan.com',
    nativeCurrency: ETH,
  },
  31337: { id: 31337, name: 'Anvil (local)', nativeCurrency: ETH },
  1337: { id: 1337, name: 'Local', nativeCurrency: ETH },
};

/** Look up metadata for a known chain id, or `undefined` if unknown. */
export function knownChain(chainId: number): KnownChain | undefined {
  return KNOWN_CHAINS[chainId];
}

/** Block-explorer base URL for a chain id (no trailing slash), or `undefined`. */
export function explorerUrlForChain(chainId: number): string | undefined {
  return KNOWN_CHAINS[chainId]?.explorerUrl;
}

/** Human-readable chain name for a chain id, falling back to `Chain <id>`. */
export function chainName(chainId: number): string {
  return KNOWN_CHAINS[chainId]?.name ?? `Chain ${chainId}`;
}

/** Explorer URL for a transaction hash on a chain, or `undefined` if unknown. */
export function txUrl(chainId: number, hash: string): string | undefined {
  const base = explorerUrlForChain(chainId);
  return base ? `${base}/tx/${hash}` : undefined;
}

/** Explorer URL for an address on a chain, or `undefined` if unknown. */
export function addressUrl(chainId: number, address: string): string | undefined {
  const base = explorerUrlForChain(chainId);
  return base ? `${base}/address/${address}` : undefined;
}
