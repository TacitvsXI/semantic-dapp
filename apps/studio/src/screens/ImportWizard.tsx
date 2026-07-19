import { useState, type ChangeEvent } from 'react';
import { isAddress } from 'viem';
import { parseAbiJson } from '@semantic-dapp/spec';
import { DEFAULT_CHAIN_ID, DEFAULT_RPC_URL, type Project } from '../state/project.js';
import { newProjectId, saveProject } from '../state/storage.js';

export interface ImportWizardProps {
  onCancel: () => void;
  onCreated: (project: Project) => void;
}

const SAMPLE_HINT = '[{"type":"function","name":"balanceOf", ...}]';

/** Step-through wizard for manually importing an ABI and creating a project. */
export function ImportWizard({ onCancel, onCreated }: ImportWizardProps) {
  const [name, setName] = useState('');
  const [abiText, setAbiText] = useState('');
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState(String(DEFAULT_CHAIN_ID));
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_RPC_URL);
  const [error, setError] = useState<string | null>(null);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAbiText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const handleCreate = () => {
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
    const chainIdNum = Number(chainId);
    if (!Number.isInteger(chainIdNum) || chainIdNum <= 0) {
      setError('Chain ID must be a positive integer.');
      return;
    }
    if (!rpcUrl.trim()) {
      setError('An RPC URL is required to read from and write to the chain.');
      return;
    }

    const now = Date.now();
    const project: Project = {
      id: newProjectId(),
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
      abi: parsed.abi,
      contract: {
        chainId: chainIdNum,
        ...(address.trim() ? { address: address.trim() } : {}),
      },
      rpcUrl: rpcUrl.trim(),
    };
    saveProject(project);
    onCreated(project);
  };

  return (
    <div className="studio-wizard">
      <h2>Import a contract</h2>
      <p className="studio-wizard__lead">
        Paste an ABI (or a Foundry/Hardhat artifact). An address and RPC let you read and write
        live; without them you can still explore the generated interface.
      </p>

      <label className="studio-field">
        <span>Project name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Token" />
      </label>

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
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x…" />
        </label>
        <label className="studio-field">
          <span>Chain ID</span>
          <input value={chainId} onChange={(e) => setChainId(e.target.value)} inputMode="numeric" />
        </label>
      </div>

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
        <button className="sd-btn sd-btn--write" onClick={handleCreate}>
          Create project
        </button>
      </div>
    </div>
  );
}
