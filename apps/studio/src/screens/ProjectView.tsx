import { useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { normalizeAbi, type SemanticManifest } from '@semantic-dapp/spec';
import { applyReview } from '@semantic-dapp/classifier';
import { GeneratedApp } from '@semantic-dapp/renderer';
import { useContractRuntime } from '../runtime/useContractRuntime.js';
import { computeManifest, CONTRACT_ID } from '../state/manifest.js';
import { saveProject } from '../state/storage.js';
import { downloadJson } from '../lib/download.js';
import type { Project } from '../state/project.js';
import { SettingsPanel } from './SettingsPanel.js';

export interface ProjectViewProps {
  project: Project;
  onBack: () => void;
  onUpdated: () => void;
}

/** Renders a project's generated app. Must be wrapped in ProjectProviders. */
export function ProjectView({ project: initialProject, onBack, onUpdated }: ProjectViewProps) {
  const [project, setProject] = useState<Project>(initialProject);
  const model = useMemo(() => normalizeAbi(project.abi), [project.abi]);
  const [manifest, setManifest] = useState<SemanticManifest>(
    () => project.manifest ?? computeManifest(project, model),
  );
  const [showSettings, setShowSettings] = useState(false);
  const runtime = useContractRuntime(project);

  const persist = (nextProject: Project, nextManifest: SemanticManifest) => {
    const saved = { ...nextProject, manifest: nextManifest };
    setProject(saved);
    setManifest(nextManifest);
    saveProject(saved);
    onUpdated();
  };

  const persistManifest = (next: SemanticManifest) => persist(project, next);

  const reanalyze = () => persist(project, computeManifest(project, model));

  const saveSettings = (patch: {
    address?: string;
    chainId: number;
    rpcUrl: string;
    contractName?: string;
  }) => {
    const next: Project = {
      ...project,
      rpcUrl: patch.rpcUrl,
      contract: {
        chainId: patch.chainId,
        ...(patch.address ? { address: patch.address } : {}),
        ...(patch.contractName ? { name: patch.contractName } : {}),
      },
    };
    persist(next, computeManifest(next, model));
    setShowSettings(false);
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
          <button className="sd-btn sd-btn--ghost" onClick={() => setShowSettings((s) => !s)}>
            Settings
          </button>
          <button
            className="sd-btn sd-btn--ghost"
            onClick={() => downloadJson(`${project.name || 'manifest'}.manifest.json`, manifest)}
          >
            Export manifest
          </button>
          <button className="sd-btn sd-btn--ghost" onClick={reanalyze}>
            Re-analyze
          </button>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>
      </header>

      {showSettings ? (
        <SettingsPanel
          project={project}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      ) : null}

      <GeneratedApp
        manifest={manifest}
        model={model}
        runtime={runtime}
        contractId={CONTRACT_ID}
        review={{
          onConfirm: (id) => persistManifest(applyReview(manifest, id, { type: 'confirm' })),
          onMoveToRaw: (id) => persistManifest(applyReview(manifest, id, { type: 'move-to-raw' })),
        }}
      />
    </div>
  );
}
