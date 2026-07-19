import { http, createConfig, type Config } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { defineChainFromConfig, type ChainConfig } from './chains.js';

/**
 * Create a wagmi config for the studio. Phase 1 uses only the injected
 * connector (e.g. MetaMask/Rabby) to avoid requiring a WalletConnect project id;
 * additional connectors are planned for a later phase.
 */
export function createStudioWagmiConfig(chainConfig: ChainConfig): Config {
  const chain = defineChainFromConfig(chainConfig);
  return createConfig({
    chains: [chain],
    connectors: [injected()],
    transports: {
      [chain.id]: http(chainConfig.rpcUrl),
    },
  });
}
