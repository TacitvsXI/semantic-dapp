import { useMemo, useState } from 'react';
import { normalizeAbi, type SemanticManifest } from '@semantic-dapp/spec';
import { applyReview } from '@semantic-dapp/classifier';
import { GeneratedApp } from '@semantic-dapp/renderer';
import { useContractRuntime } from '../runtime/useContractRuntime.js';
import { computeManifest, CONTRACT_ID } from '../state/manifest.js';
import { saveProject } from '../state/storage.js';
import type { Project } from '../state/project.js';

export interface ProjectViewProps {
  project: Project;
  onBack: () => void;
}

function shorten(address?: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Renders a project's generated app. Must be wrapped in ProjectProviders. */
export function ProjectView({ project, onBack }: ProjectViewProps) {
  const model = useMemo(() => normalizeAbi(project.abi), [project.abi]);
  const [manifest, setManifest] = useState<SemanticManifest>(
    () => project.manifest ?? computeManifest(project, model),
  );
  const runtime = useContractRuntime(project);

  const persist = (next: SemanticManifest) => {
    setManifest(next);
    saveProject({ ...project, manifest: next });
  };

  const reanalyze = () => {
    persist(computeManifest(project, model));
  };

  const standards = manifest.contracts[0]?.standards ?? [];

  return (
    <div className="studio-project">
      <header className="studio-project__bar">
        <div className="studio-project__id">
          <button className="sd-btn sd-btn--ghost" onClick={onBack}>
            ← Projects
          </button>
          <div>
            <h2>{project.name}</h2>
            <span className="studio-project__meta">
              chain {project.contract.chainId} ·{' '}
              {project.contract.address
                ? project.contract.address
                : 'no address (read/write disabled)'}
              {standards.length > 0 ? ` · ${standards.join(', ')}` : ''}
            </span>
          </div>
        </div>

        <div className="studio-wallet">
          <button className="sd-btn sd-btn--ghost" onClick={reanalyze}>
            Re-analyze
          </button>
          {runtime.wallet.isConnected ? (
            <>
              <span className="studio-wallet__addr">{shorten(runtime.wallet.address)}</span>
              <button className="sd-btn sd-btn--ghost" onClick={runtime.wallet.disconnect}>
                Disconnect
              </button>
            </>
          ) : (
            <button className="sd-btn sd-btn--write" onClick={runtime.wallet.connect}>
              Connect wallet
            </button>
          )}
        </div>
      </header>

      <GeneratedApp
        manifest={manifest}
        model={model}
        runtime={runtime}
        contractId={CONTRACT_ID}
        review={{
          onConfirm: (id) => persist(applyReview(manifest, id, { type: 'confirm' })),
          onMoveToRaw: (id) => persist(applyReview(manifest, id, { type: 'move-to-raw' })),
        }}
      />
    </div>
  );
}
