import { useMemo, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStudioWagmiConfig } from '@semantic-dapp/execution';
import type { Project } from '../state/project.js';

const queryClient = new QueryClient();

/**
 * Wallet + query providers scoped to a project's chain/RPC. Remount via a
 * `key={project.id}` when switching projects so the config is rebuilt.
 */
export function ProjectProviders({ project, children }: { project: Project; children: ReactNode }) {
  const config = useMemo(
    () =>
      createStudioWagmiConfig({
        chainId: project.contract.chainId,
        rpcUrl: project.rpcUrl,
        name: project.contract.name ?? project.name,
      }),
    [project.contract.chainId, project.rpcUrl, project.contract.name, project.name],
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
