import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  isManifestStale,
  migrateManifest,
  normalizeAbi,
  type SemanticManifest,
} from '@semantic-dapp/spec';
import { applyReview } from '@semantic-dapp/classifier';
import { GeneratedApp } from '@semantic-dapp/renderer';
import { AddressView, AuditLog, type AuditEntry } from '@semantic-dapp/components';
import { explorerUrlForChain } from '@semantic-dapp/execution';
import { buildBundle, bundleFilename } from '@semantic-dapp/export';
import { useContractRuntime, type WriteRecord } from '../runtime/useContractRuntime.js';
import { computeManifest, CONTRACT_ID } from '../state/manifest.js';
import { saveProject } from '../state/storage.js';
import { fetchCodeHash } from '../state/codehash.js';
import { appendHistory, clearHistory, loadHistory, newEntryId } from '../state/history.js';
import { downloadJson } from '../lib/download.js';
import type { Project } from '../state/project.js';
import { SettingsPanel } from './SettingsPanel.js';
import { ManifestEditor } from './ManifestEditor.js';

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
  const [showEditor, setShowEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [history, setHistory] = useState<AuditEntry[]>(() => loadHistory(initialProject.id));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recordWrite = useCallback(
    (rec: WriteRecord) => {
      const entry: AuditEntry = { id: newEntryId(), timestamp: Date.now(), ...rec };
      setHistory(appendHistory(initialProject.id, entry));
    },
    [initialProject.id],
  );

  const runtime = useContractRuntime(project, { onWrite: recordWrite });

  const persist = (nextProject: Project, nextManifest: SemanticManifest) => {
    const saved = { ...nextProject, manifest: nextManifest };
    setProject(saved);
    setManifest(nextManifest);
    saveProject(saved);
    onUpdated();
  };

  const persistManifest = (next: SemanticManifest) => persist(project, next);

  // Package identity + ABI + reviewed manifest into a portable bundle the
  // standalone template (or CLI-exported app) can render (ADR-009).
  const exportApp = () => {
    const bundle = buildBundle({
      name: project.name,
      chainId: project.contract.chainId,
      abi: project.abi,
      manifest,
      rpcUrl: project.rpcUrl,
      ...(project.contract.address ? { address: project.contract.address } : {}),
      ...(project.contract.name ? { contractName: project.contract.name } : {}),
    });
    downloadJson(bundleFilename(project.name), bundle);
  };

  // Re-run classification on the current ABI (preserving reviewed edits) and
  // refresh the recorded implementation code hash so the staleness check resets.
  const reanalyze = async () => {
    const target = project.proxy?.implementation ?? project.contract.address;
    let nextProject = project;
    if (target) {
      try {
        const live = await fetchCodeHash({
          chainId: project.contract.chainId,
          rpcUrl: project.rpcUrl,
          address: target,
        });
        if (live) nextProject = { ...project, codeHash: live };
      } catch {
        /* keep the existing code hash on failure */
      }
    }
    persist(nextProject, computeManifest(nextProject, model));
  };

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

  const importManifest = (event: ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(reader.result ?? ''));
      } catch (e) {
        setImportError(`Invalid JSON: ${(e as Error).message}`);
        return;
      }
      const result = migrateManifest(parsed);
      if (!result.ok || !result.manifest) {
        setImportError(`Manifest is invalid: ${result.error ?? 'unknown error'}`);
        return;
      }
      persistManifest(result.manifest);
    };
    reader.readAsText(file);
  };

  // Detect a stale manifest by comparing the recorded implementation code hash
  // to the one currently on-chain (proxies point at their implementation).
  useEffect(() => {
    const target = project.proxy?.implementation ?? project.contract.address;
    if (!project.codeHash || !target) {
      setStale(false);
      return;
    }
    let cancelled = false;
    void fetchCodeHash({
      chainId: project.contract.chainId,
      rpcUrl: project.rpcUrl,
      address: target,
    })
      .then((live) => {
        if (!cancelled) setStale(isManifestStale(manifest, live, CONTRACT_ID));
      })
      .catch(() => {
        if (!cancelled) setStale(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    project.codeHash,
    project.proxy?.implementation,
    project.contract.address,
    project.contract.chainId,
    project.rpcUrl,
    manifest,
  ]);

  const standards = manifest.contracts[0]?.standards ?? [];
  const address = project.contract.address;
  const explorerUrl = explorerUrlForChain(project.contract.chainId);

  return (
    <div className="studio-project">
      <header className="studio-project__bar">
        <div className="studio-project__top">
          <div className="studio-project__id">
            <button className="sd-btn sd-btn--ghost" onClick={onBack}>
              ← Projects
            </button>
            <div className="studio-project__idtext">
              <h2>{project.name}</h2>
              <span className="studio-project__meta">
                <span>chain {project.contract.chainId}</span>
                {address ? (
                  <>
                    <span className="studio-project__dot">·</span>
                    <AddressView address={address} {...(explorerUrl ? { explorerUrl } : {})} />
                  </>
                ) : (
                  <>
                    <span className="studio-project__dot">·</span>
                    <span>no address (read/write disabled)</span>
                  </>
                )}
                {standards.length > 0 ? (
                  <>
                    <span className="studio-project__dot">·</span>
                    <span>{standards.join(', ')}</span>
                  </>
                ) : null}
              </span>
              {project.provenance ? (
                <span className="studio-provenance">
                  <span
                    className={`studio-provenance__tag ${
                      project.provenance.verified
                        ? 'studio-provenance__tag--ok'
                        : 'studio-provenance__tag--warn'
                    }`}
                  >
                    {project.provenance.verified ? 'verified' : 'unverified'}
                  </span>
                  via {project.provenance.sourceName}
                  {project.provenance.matchType ? ` (${project.provenance.matchType})` : ''}
                  {project.proxy?.isProxy
                    ? ` · ${project.proxy.kind}${
                        project.proxy.implementation
                          ? ` → ${project.proxy.implementation.slice(0, 10)}…`
                          : ''
                      }`
                    : ''}
                </span>
              ) : null}
            </div>
          </div>

          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>

        <div className="studio-project__actions">
          <button className="sd-btn sd-btn--ghost" onClick={() => setShowSettings((s) => !s)}>
            Settings
          </button>
          <button className="sd-btn sd-btn--ghost" onClick={() => setShowEditor((s) => !s)}>
            Edit manifest
          </button>
          <button
            className="sd-btn sd-btn--ghost"
            onClick={() => downloadJson(`${project.name || 'manifest'}.manifest.json`, manifest)}
          >
            Export manifest
          </button>
          <button className="sd-btn sd-btn--write" onClick={exportApp}>
            Export app
          </button>
          <button className="sd-btn sd-btn--ghost" onClick={() => fileInputRef.current?.click()}>
            Import manifest
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={importManifest}
          />
          <button className="sd-btn sd-btn--ghost" onClick={() => void reanalyze()}>
            Re-analyze
          </button>
          <button className="sd-btn sd-btn--ghost" onClick={() => setShowHistory((s) => !s)}>
            History{history.length > 0 ? ` (${history.length})` : ''}
          </button>
        </div>
      </header>

      {importError ? <p className="studio-error">{importError}</p> : null}

      {stale ? (
        <div className="studio-banner studio-banner--warn">
          <span>
            This manifest was built against a different implementation than the one currently
            on-chain. The contract may have been upgraded.
          </span>
          <button className="sd-btn sd-btn--write" onClick={() => void reanalyze()}>
            Re-analyze
          </button>
        </div>
      ) : null}

      {showSettings ? (
        <SettingsPanel
          project={project}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      ) : null}

      {showEditor ? (
        <ManifestEditor
          manifest={manifest}
          onSave={(next) => {
            persistManifest(next);
            setShowEditor(false);
          }}
          onClose={() => setShowEditor(false)}
        />
      ) : null}

      {showHistory ? (
        <AuditLog
          entries={history}
          {...(explorerUrl ? { explorerUrl } : {})}
          onExport={() => downloadJson(`${project.name || 'project'}.history.json`, history)}
          onClear={() => {
            clearHistory(initialProject.id);
            setHistory([]);
          }}
        />
      ) : null}

      <GeneratedApp
        manifest={manifest}
        model={model}
        runtime={runtime}
        contractId={CONTRACT_ID}
        safety={{
          ...(project.provenance ? { verified: project.provenance.verified } : {}),
          stale,
        }}
        review={{
          onConfirm: (id) => persistManifest(applyReview(manifest, id, { type: 'confirm' })),
          onMoveToRaw: (id) => persistManifest(applyReview(manifest, id, { type: 'move-to-raw' })),
        }}
      />
    </div>
  );
}
