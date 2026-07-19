import type { SemanticManifest } from '@semantic-dapp/spec';
import { OverviewPanel } from '@semantic-dapp/components';
import type { ContractRuntime } from './runtime.js';
import type { GeneratedLayout } from './sections.js';

export interface OverviewSummaryProps {
  manifest: SemanticManifest;
  layout: GeneratedLayout;
  runtime: ContractRuntime;
  contractId?: string;
}

/** Compute Overview props from the manifest + layout and render the panel. */
export function OverviewSummary({ manifest, layout, runtime, contractId }: OverviewSummaryProps) {
  const contract = contractId
    ? manifest.contracts.find((c) => c.id === contractId)
    : manifest.contracts[0];

  const semanticOps = manifest.operations.filter(
    (op) => (!contractId || op.contract === contractId) && op.visibility !== 'raw-only',
  );
  const averageConfidence =
    semanticOps.length > 0
      ? semanticOps.reduce((sum, op) => sum + op.confidence, 0) / semanticOps.length
      : undefined;

  const sectionCounts = layout.sections.map((s) => ({
    label: s.title,
    count: s.operations.length,
  }));

  return (
    <OverviewPanel
      contractName={contract?.name}
      address={contract?.address}
      chainId={contract?.chainId}
      standards={contract?.standards ?? []}
      sectionCounts={sectionCounts}
      averageConfidence={averageConfidence}
      wallet={{
        connected: runtime.wallet.isConnected,
        address: runtime.wallet.address,
        chainId: runtime.wallet.chainId,
      }}
    />
  );
}
