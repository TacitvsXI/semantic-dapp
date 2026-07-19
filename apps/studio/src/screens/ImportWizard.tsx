import { useState, type ChangeEvent } from 'react';
import { getAddress, isAddress } from 'viem';
import { parseAbiJson } from '@semantic-dapp/spec';
import type { ResolvedContract } from '@semantic-dapp/resolver';
import { DEFAULT_CHAIN_ID, DEFAULT_RPC_URL, type Project } from '../state/project.js';
import { newProjectId, saveProject } from '../state/storage.js';
import { resolveByAddress } from '../state/resolve.js';

export interface ImportWizardProps {
  onCancel: () => void;
  onCreated: (project: Project) => void;
}

type Mode = 'abi' | 'address';

const SAMPLE_HINT = '[{"type":"function","name":"balanceOf", ...}]';

/** Wizard for importing a contract by pasting an ABI or resolving from an address. */
export function ImportWizard({ onCancel, onCreated }: ImportWizardProps) {
  const [mode, setMode] = useState<Mode>('abi');
  const [name, setName] = useState('');
  const [chainId, setChainId] = useState(String(DEFAULT_CHAIN_ID));
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_RPC_URL);
  const [error, setError] = useState<string | null>(null);

  // Paste-ABI mode
  const [abiText, setAbiText] = useState('');
  const [address, setAddress] = useState('');

  // By-address mode
  const [apiKey, setApiKey] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedContract | null>(null);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAbiText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const validateChainAndRpc = (): number | null => {
    const chainIdNum = Number(chainId);
    if (!Number.isInteger(chainIdNum) || chainIdNum <= 0) {
      setError('Chain ID must be a positive integer.');
      return null;
    }
    if (!rpcUrl.trim()) {
      setError('An RPC URL is required to read from and write to the chain.');
      return null;
    }
    return chainIdNum;
  };

  const handleCreateFromAbi = () => {
    setError(null);
    if (!name.trim()) {
      setError('Give the project a name.');
      return;
    }
    const parsed = parseAbiJson(abiText);
    if (!parsed.success || !parsed.abi) {
      setError(`ABI is invalid: ${parsed.error ?? 'unknown error'}`);
      return;
    }
    if (address.trim() && !isAddress(address.trim())) {
      setError('Contract address is not a valid EVM address.');
      return;
    }
    const chainIdNum = validateChainAndRpc();
    if (chainIdNum === null) return;

    const now = Date.now();
    const project: Project = {
      id: newProjectId(),
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
      abi: parsed.abi,
      contract: {
        chainId: chainIdNum,
        ...(address.trim() ? { address: getAddress(address.trim()) } : {}),
      },
      rpcUrl: rpcUrl.trim(),
    };
    saveProject(project);
    onCreated(project);
  };

  const handleResolve = async () => {
    setError(null);
    setResolved(null);
    if (!isAddress(address.trim())) {
      setError('Enter a valid contract address to resolve.');
      return;
    }
    const chainIdNum = validateChainAndRpc();
    if (chainIdNum === null) return;

    setResolving(true);
    try {
      const result = await resolveByAddress({
        address: getAddress(address.trim()),
        chainId: chainIdNum,
        rpcUrl: rpcUrl.trim(),
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      });
      if (!result.ok) {
        setError(
          `Could not resolve (tried: ${result.triedSources.join(', ') || 'none'}): ` +
            `${result.reason}. Switch to "Paste ABI" to import manually.`,
        );
        return;
      }
      setResolved(result.contract);
    } catch (e) {
      setError(`Resolve failed: ${(e as Error).message}`);
    } finally {
      setResolving(false);
    }
  };

  const handleCreateFromResolved = () => {
    if (!resolved) return;
    const now = Date.now();
    const project: Project = {
      id: newProjectId(),
      name: name.trim() || resolved.contractName || 'Contract',
      createdAt: now,
      updatedAt: now,
      abi: resolved.abi,
      contract: {
        chainId: resolved.chainId,
        address: resolved.address,
        ...(resolved.contractName ? { name: resolved.contractName } : {}),
      },
      rpcUrl: rpcUrl.trim(),
      provenance: resolved.provenance,
      ...(resolved.proxy ? { proxy: resolved.proxy } : {}),
    };
    saveProject(project);
    onCreated(project);
  };

  return (
    <div className="studio-wizard">
      <h2>Import a contract</h2>

      <div className="sd-tabs" role="tablist">
        <button
          role="tab"
          className={`sd-tab ${mode === 'abi' ? 'sd-tab--active' : ''}`}
          aria-selected={mode === 'abi'}
          onClick={() => {
            setMode('abi');
            setError(null);
          }}
        >
          Paste ABI
        </button>
        <button
          role="tab"
          className={`sd-tab ${mode === 'address' ? 'sd-tab--active' : ''}`}
          aria-selected={mode === 'address'}
          onClick={() => {
            setMode('address');
            setError(null);
          }}
        >
          By address
        </button>
      </div>

      <label className="studio-field">
        <span>Project name{mode === 'address' ? ' (optional)' : ''}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Token" />
      </label>

      {mode === 'abi' ? (
        <>
          <p className="studio-wizard__lead">
            Paste an ABI (or a Foundry/Hardhat artifact). An address and RPC let you read and write
            live; without them you can still explore the generated interface.
          </p>
          <label className="studio-field">
            <span>ABI JSON</span>
            <textarea
              value={abiText}
              onChange={(e) => setAbiText(e.target.value)}
              rows={10}
              placeholder={SAMPLE_HINT}
              spellCheck={false}
            />
          </label>
          <label className="studio-field studio-field--file">
            <span>…or upload a file</span>
            <input type="file" accept=".json,application/json" onChange={onFile} />
          </label>
          <div className="studio-field-row">
            <label className="studio-field">
              <span>Contract address (optional)</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x…"
              />
            </label>
            <label className="studio-field">
              <span>Chain ID</span>
              <input
                value={chainId}
                onChange={(e) => setChainId(e.target.value)}
                inputMode="numeric"
              />
            </label>
          </div>
        </>
      ) : (
        <>
          <p className="studio-wizard__lead">
            Enter a verified contract address. The studio resolves the ABI from Sourcify or a block
            explorer, follows proxies to their implementation, and records provenance.
          </p>
          <div className="studio-field-row">
            <label className="studio-field">
              <span>Contract address</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x…"
              />
            </label>
            <label className="studio-field">
              <span>Chain ID</span>
              <input
                value={chainId}
                onChange={(e) => setChainId(e.target.value)}
                inputMode="numeric"
              />
            </label>
          </div>
          <label className="studio-field">
            <span>Explorer API key (optional, improves coverage)</span>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Etherscan v2 API key"
            />
          </label>
          <button className="sd-btn sd-btn--read" onClick={handleResolve} disabled={resolving}>
            {resolving ? 'Resolving…' : 'Resolve ABI'}
          </button>

          {resolved ? (
            <div className="studio-resolved">
              <h3>Resolved</h3>
              <ul>
                <li>
                  Source: <strong>{resolved.provenance.sourceName}</strong>{' '}
                  {resolved.provenance.verified ? '(verified)' : '(unverified)'}
                  {resolved.provenance.matchType ? ` · ${resolved.provenance.matchType} match` : ''}
                </li>
                {resolved.contractName ? (
                  <li>
                    Contract: <strong>{resolved.contractName}</strong>
                  </li>
                ) : null}
                {resolved.proxy?.isProxy ? (
                  <li>
                    Proxy: <strong>{resolved.proxy.kind}</strong>
                    {resolved.proxy.implementation
                      ? ` → impl ${resolved.proxy.implementation}`
                      : ''}
                  </li>
                ) : null}
                <li>Confidence: {(resolved.confidence * 100).toFixed(0)}%</li>
                <li>ABI items: {resolved.abi.length}</li>
              </ul>
            </div>
          ) : null}
        </>
      )}

      <label className="studio-field">
        <span>RPC URL</span>
        <input
          value={rpcUrl}
          onChange={(e) => setRpcUrl(e.target.value)}
          placeholder="http://127.0.0.1:8545"
        />
      </label>

      {error ? <p className="studio-error">{error}</p> : null}

      <div className="studio-wizard__actions">
        <button className="sd-btn" onClick={onCancel}>
          Cancel
        </button>
        {mode === 'abi' ? (
          <button className="sd-btn sd-btn--write" onClick={handleCreateFromAbi}>
            Create project
          </button>
        ) : (
          <button
            className="sd-btn sd-btn--write"
            onClick={handleCreateFromResolved}
            disabled={!resolved}
          >
            Create project
          </button>
        )}
      </div>
    </div>
  );
}
