import {
  defineChain,
  createPublicClient,
  http,
  custom,
  fallback,
  type Chain,
  type EIP1193Provider,
  type PublicClient,
  type Transport,
} from 'viem';

export interface ChainConfig {
  chainId: number;
  rpcUrl: string;
  name?: string;
  nativeCurrency?: { name: string; symbol: string; decimals: number };
  blockExplorerUrl?: string;
}

/**
 * Build a viem {@link Chain} from a chain id + RPC URL. This keeps the app
 * self-hostable and RPC-agnostic (a custom RPC can always be provided).
 */
export function defineChainFromConfig(config: ChainConfig): Chain {
  const nativeCurrency = config.nativeCurrency ?? {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  };
  return defineChain({
    id: config.chainId,
    name: config.name ?? `Chain ${config.chainId}`,
    nativeCurrency,
    rpcUrls: {
      default: { http: [config.rpcUrl] },
    },
    ...(config.blockExplorerUrl
      ? {
          blockExplorers: {
            default: { name: 'Explorer', url: config.blockExplorerUrl },
          },
        }
      : {}),
  });
}

/** Create a read-only public client for a given chain configuration. */
export function createPublicClientFor(config: ChainConfig): PublicClient {
  const chain = defineChainFromConfig(config);
  return createPublicClient({ chain, transport: http(config.rpcUrl) });
}

/**
 * Create a read client that can fall back to a connected wallet's EIP-1193
 * provider. Reads normally go over the configured HTTP RPC, but a public RPC may
 * be missing, rate-limited, or blocked by CORS in the browser (surfacing as
 * "HTTP request failed"). When a wallet provider is supplied — and it is on the
 * same chain — we add it as a fallback transport so a connected user can still
 * read the contract through their wallet.
 *
 * Pass a `provider` only when it is known to be on `config.chainId`, otherwise
 * reads could hit the wrong chain.
 */
export function createReadClientFor(config: ChainConfig, provider?: EIP1193Provider): PublicClient {
  const chain = defineChainFromConfig(config);
  const transports: Transport[] = [];
  if (config.rpcUrl) transports.push(http(config.rpcUrl));
  if (provider) transports.push(custom(provider));
  const transport: Transport =
    transports.length === 0
      ? http(config.rpcUrl)
      : transports.length === 1
        ? transports[0]!
        : fallback(transports);
  return createPublicClient({ chain, transport });
}
