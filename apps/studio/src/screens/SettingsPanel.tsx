import { useState } from 'react';
import { isAddress } from 'viem';
import type { Project } from '../state/project.js';

export interface SettingsPanelProps {
  project: Project;
  onSave: (patch: {
    address?: string;
    chainId: number;
    rpcUrl: string;
    contractName?: string;
  }) => void;
  onClose: () => void;
}

/** Edit connection settings (address / chain / RPC) after import. */
export function SettingsPanel({ project, onSave, onClose }: SettingsPanelProps) {
  const [address, setAddress] = useState(project.contract.address ?? '');
  const [contractName, setContractName] = useState(project.contract.name ?? '');
  const [chainId, setChainId] = useState(String(project.contract.chainId));
  const [rpcUrl, setRpcUrl] = useState(project.rpcUrl);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
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
      setError('An RPC URL is required.');
      return;
    }
    onSave({
      ...(address.trim() ? { address: address.trim() } : {}),
      ...(contractName.trim() ? { contractName: contractName.trim() } : {}),
      chainId: chainIdNum,
      rpcUrl: rpcUrl.trim(),
    });
  };

  return (
    <div className="studio-settings">
      <h3>Connection settings</h3>
      <div className="studio-field-row">
        <label className="studio-field">
          <span>Contract address</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x…" />
        </label>
        <label className="studio-field">
          <span>Contract name (optional)</span>
          <input value={contractName} onChange={(e) => setContractName(e.target.value)} />
        </label>
      </div>
      <div className="studio-field-row">
        <label className="studio-field">
          <span>Chain ID</span>
          <input value={chainId} onChange={(e) => setChainId(e.target.value)} inputMode="numeric" />
        </label>
        <label className="studio-field">
          <span>RPC URL</span>
          <input value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} />
        </label>
      </div>
      {error ? <p className="studio-error">{error}</p> : null}
      <div className="studio-settings__actions">
        <button className="sd-btn" onClick={onClose}>
          Cancel
        </button>
        <button className="sd-btn sd-btn--write" onClick={save}>
          Save settings
        </button>
      </div>
    </div>
  );
}
