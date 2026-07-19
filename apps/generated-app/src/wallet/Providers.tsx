import { useMemo, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { buildWagmiConfig } from './config.js';

const queryClient = new QueryClient();

const rkTheme = darkTheme({
  // Darker blue than RainbowKit's default so white text on the connect button
  // clears the WCAG AA 4.5:1 contrast threshold (see ADR-010 a11y gate).
  accentColor: '#1d4ed8',
  accentColorForeground: '#ffffff',
  borderRadius: 'medium',
  overlayBlur: 'small',
});

export interface AppProvidersProps {
  chainId: number;
  rpcUrl: string;
  name?: string;
  children: ReactNode;
}

/** Wallet + query providers for the standalone app, scoped to the bundle's chain. */
export function AppProviders({ chainId, rpcUrl, name, children }: AppProvidersProps) {
  const config = useMemo(
    () => buildWagmiConfig({ chainId, rpcUrl, ...(name ? { name } : {}) }),
    [chainId, rpcUrl, name],
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* Default the connect/switch flow to the bundle's chain to cut down on
            wrong-network prompts. */}
        <RainbowKitProvider theme={rkTheme} modalSize="compact" initialChain={chainId}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
