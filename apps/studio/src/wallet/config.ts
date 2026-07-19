import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http, type Config } from 'wagmi';
import { defineChainFromConfig, type ChainConfig } from '@semantic-dapp/execution';

const APP_NAME = 'Semantic Dapp Studio';

/**
 * WalletConnect project id, if configured. Optional: without it the studio still
 * works with injected wallets (MetaMask/Rabby), which is enough for local dev.
 * Set `VITE_WALLETCONNECT_PROJECT_ID` to enable the full RainbowKit wallet list.
 */
export function walletConnectProjectId(): string | undefined {
  const id = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  return id && id.length > 0 ? id : undefined;
}

/** Build a wagmi config with RainbowKit connectors for a project's chain/RPC. */
export function buildWagmiConfig(chainConfig: ChainConfig): Config {
  const chain = defineChainFromConfig(chainConfig);
  const projectId = walletConnectProjectId();

  // WalletConnect-backed wallets need a project id; only offer them when set.
  const wallets = projectId
    ? [
        {
          groupName: 'Popular',
          wallets: [
            injectedWallet,
            metaMaskWallet,
            rainbowWallet,
            coinbaseWallet,
            walletConnectWallet,
          ],
        },
      ]
    : [{ groupName: 'Installed', wallets: [injectedWallet] }];

  const connectors = connectorsForWallets(wallets, {
    appName: APP_NAME,
    projectId: projectId ?? 'semantic-dapp-local',
  });

  return createConfig({
    chains: [chain],
    connectors,
    transports: {
      [chain.id]: http(chainConfig.rpcUrl),
    },
    ssr: false,
  });
}
