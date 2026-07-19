import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { injectedWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http, type Config } from 'wagmi';
import { defineChainFromConfig, type ChainConfig } from '@semantic-dapp/execution';

const APP_NAME = 'Semantic Dapp';

/**
 * A minimal wagmi config for the standalone app: injected wallet only, so it runs
 * anywhere without a WalletConnect project id. Templates are meant to be owned
 * and extended by their author — add more connectors here as needed.
 */
export function buildWagmiConfig(chainConfig: ChainConfig): Config {
  const chain = defineChainFromConfig(chainConfig);
  const connectors = connectorsForWallets([{ groupName: 'Installed', wallets: [injectedWallet] }], {
    appName: APP_NAME,
    projectId: 'semantic-dapp-standalone',
  });

  return createConfig({
    chains: [chain],
    connectors,
    transports: { [chain.id]: http(chainConfig.rpcUrl) },
    ssr: false,
  });
}
