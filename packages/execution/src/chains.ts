import { defineChain, createPublicClient, http, type Chain, type PublicClient } from 'viem';

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
