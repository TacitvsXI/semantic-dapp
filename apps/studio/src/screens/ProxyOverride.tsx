import { useState } from 'react';
import type { Abi, Address } from 'viem';
import { getAddress, isAddress } from 'viem';
import { parseAbiJson } from '@semantic-dapp/spec';
import { parseNatSpec, type SourceDocs } from '@semantic-dapp/analyzer';
import type { Provenance } from '@semantic-dapp/resolver';
import type { Project } from '../state/project.js';
import { resolveByAddress } from '../state/resolve.js';

/** Everything the project needs to switch to a manually-chosen implementation. */
export interface ProxyOverridePatch {
  abi: Abi;
  implementation?: Address;
  provenance?: Provenance;
  codeHash?: string;
  sourceDocs?: SourceDocs;
}

export interface ProxyOverrideProps {
  project: Project;
  onApply: (patch: ProxyOverridePatch) => void;
}

type Mode = 'address' | 'abi';

/**
 * Lets the user manually point a proxy at its real implementation when auto
 * resolution failed: resolve a verified ABI from an implementation address, or
 * paste the implementation ABI directly. The proxy address stays the call
 * target (that's where delegatecalls execute) - only the ABI changes.
 */
export function ProxyOverride({ project, onApply }: ProxyOverrideProps) {
  const [mode, setMode] = useState<Mode>('address');
  const [implAddress, setImplAddress] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [abiText, setAbiText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyFromAddress = async () => {
    setError(null);
    if (!isAddress(implAddress.trim())) {
      setError('Enter a valid implementation address.');
      return;
    }
    setBusy(true);
    try {
      const result = await resolveByAddress({
        address: getAddress(implAddress.trim()),
        chainId: project.contract.chainId,
        rpcUrl: project.rpcUrl,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      });
      if (!result.ok) {
        setError(
          `Could not resolve (tried: ${result.triedSources.join(', ') || 'none'}): ` +
            `${result.reason}. Switch to "Paste ABI" to import it manually.`,
        );
        return;
      }
      const resolved = result.contract;
      const sourceDocs = resolved.sources ? parseNatSpec(resolved.sources) : undefined;
      const hasDocs = sourceDocs && Object.keys(sourceDocs).length > 0;
      onApply({
        abi: resolved.abi,
        implementation: resolved.address,
        provenance: resolved.provenance,
        ...(resolved.codeHash ? { codeHash: resolved.codeHash } : {}),
        ...(hasDocs ? { sourceDocs } : {}),
      });
    } catch (e) {
      setError(`Resolve failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const applyFromAbi = () => {
    setError(null);
    const parsed = parseAbiJson(abiText);
    if (!parsed.success || !parsed.abi) {
      setError(`ABI is invalid: ${parsed.error ?? 'unknown error'}`);
      return;
    }
    onApply({
      abi: parsed.abi,
      ...(isAddress(implAddress.trim()) ? { implementation: getAddress(implAddress.trim()) } : {}),
    });
  };

  return (
    <div className="studio-proxy-override">
      <div className="sd-tabs" role="tablist">
        <button
          role="tab"
          className={`sd-tab ${mode === 'address' ? 'sd-tab--active' : ''}`}
          aria-selected={mode === 'address'}
          onClick={() => {
            setMode('address');
            setError(null);
          }}
        >
          Implementation address
        </button>
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
      </div>

      {mode === 'address' ? (
        <>
          <label className="studio-field">
            <span>Implementation address</span>
            <input
              value={implAddress}
              onChange={(e) => setImplAddress(e.target.value)}
              placeholder="0x… (the logic contract behind this proxy)"
            />
          </label>
          <label className="studio-field">
            <span>Explorer API key (optional)</span>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Etherscan v2 API key"
            />
          </label>
          <button
            className="sd-btn sd-btn--write"
            onClick={() => void applyFromAddress()}
            disabled={busy}
          >
            {busy ? 'Resolving…' : 'Resolve implementation'}
          </button>
        </>
      ) : (
        <>
          <label className="studio-field">
            <span>Implementation ABI (JSON)</span>
            <textarea
              value={abiText}
              onChange={(e) => setAbiText(e.target.value)}
              rows={6}
              placeholder='[{"type":"function","name":"…"}]'
              spellCheck={false}
            />
          </label>
          <label className="studio-field">
            <span>Implementation address (optional)</span>
            <input
              value={implAddress}
              onChange={(e) => setImplAddress(e.target.value)}
              placeholder="0x… (recorded for staleness checks)"
            />
          </label>
          <button className="sd-btn sd-btn--write" onClick={applyFromAbi} disabled={busy}>
            Use this ABI
          </button>
        </>
      )}

      {error ? <p className="studio-error">{error}</p> : null}
    </div>
  );
}
