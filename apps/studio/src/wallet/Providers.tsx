import { useMemo, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { buildWagmiConfig } from './config.js';
import type { Project } from '../state/project.js';

const queryClient = new QueryClient();

const rkTheme = darkTheme({
  // Darker blue than RainbowKit's default so white text on the connect button
  // clears the WCAG AA 4.5:1 contrast threshold (matches the generated-app).
  accentColor: '#1d4ed8',
  accentColorForeground: '#ffffff',
  borderRadius: 'medium',
  overlayBlur: 'small',
});

/**
 * Wallet + query providers scoped to a project's chain/RPC. Remount via a
 * `key` derived from the chain config when it changes so the config is rebuilt.
 */
export function ProjectProviders({ project, children }: { project: Project; children: ReactNode }) {
  const config = useMemo(
    () =>
      buildWagmiConfig({
        chainId: project.contract.chainId,
        rpcUrl: project.rpcUrl,
        name: project.contract.name ?? project.name,
      }),
    [project.contract.chainId, project.rpcUrl, project.contract.name, project.name],
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* Default the connect/switch flow to the project's chain to cut down on
            wrong-network prompts. */}
        <RainbowKitProvider
          theme={rkTheme}
          modalSize="compact"
          initialChain={project.contract.chainId}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
