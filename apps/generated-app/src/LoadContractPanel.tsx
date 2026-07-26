import { useState } from 'react';
import { defaultRpcForChain, loadFromAbi, loadFromAddress } from './loadContract.js';
import type { SemanticBundle } from '@semantic-dapp/export';

type Mode = 'address' | 'abi';

export interface LoadContractPanelProps {
  open: boolean;
  onClose: () => void;
  onLoaded: (bundle: SemanticBundle) => void;
  /** Prefill from the current demo (usually mainnet). */
  defaultChainId?: number;
  defaultRpcUrl?: string;
}

/**
 * Lightweight "load your contract" form for the public Pages demo — paste an
 * address (Sourcify/explorer) or an ABI/artifact. Runs entirely in the browser.
 */
export function LoadContractPanel({
  open,
  onClose,
  onLoaded,
  defaultChainId = 1,
  defaultRpcUrl,
}: LoadContractPanelProps) {
  const [mode, setMode] = useState<Mode>('address');
  const [chainId, setChainId] = useState(String(defaultChainId));
  const [address, setAddress] = useState('');
  const [rpcUrl, setRpcUrl] = useState(defaultRpcUrl ?? defaultRpcForChain(defaultChainId));
  const [apiKey, setApiKey] = useState('');
  const [abiText, setAbiText] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const chain = Number(chainId);
      if (mode === 'abi') {
        const result = loadFromAbi({
          abiText,
          chainId: chain,
          rpcUrl,
          ...(address.trim() ? { address } : {}),
          ...(name.trim() ? { name } : {}),
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onLoaded(result.bundle);
        onClose();
        return;
      }

      const result = await loadFromAddress({
        address,
        chainId: chain,
        rpcUrl,
        ...(apiKey.trim() ? { apiKey } : {}),
        ...(name.trim() ? { name } : {}),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onLoaded(result.bundle);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="load-panel" aria-label="Load your contract">
      <header className="load-panel__head">
        <h2 className="load-panel__title">Load your contract</h2>
        <p className="load-panel__hint">
          Runs in your browser — paste a verified address or an ABI. No account required to browse
          reads.
        </p>
      </header>

      <div className="load-panel__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`load-panel__tab ${mode === 'address' ? 'load-panel__tab--active' : ''}`}
          aria-selected={mode === 'address'}
          onClick={() => {
            setMode('address');
            setError(null);
          }}
        >
          By address
        </button>
        <button
          type="button"
          role="tab"
          className={`load-panel__tab ${mode === 'abi' ? 'load-panel__tab--active' : ''}`}
          aria-selected={mode === 'abi'}
          onClick={() => {
            setMode('abi');
            setError(null);
          }}
        >
          Paste ABI
        </button>
      </div>

      <div className="load-panel__fields">
        <label className="load-panel__field">
          <span>Chain id</span>
          <input
            value={chainId}
            onChange={(e) => {
              setChainId(e.target.value);
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n > 0 && !rpcUrl) {
                setRpcUrl(defaultRpcForChain(n));
              }
            }}
            inputMode="numeric"
            placeholder="1"
          />
        </label>

        <label className="load-panel__field">
          <span>RPC URL</span>
          <input
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
            placeholder={defaultRpcForChain(Number(chainId) || 1)}
          />
        </label>

        <label className="load-panel__field">
          <span>Name (optional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My token" />
        </label>

        {mode === 'address' ? (
          <>
            <label className="load-panel__field load-panel__field--wide">
              <span>Contract address</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x…"
                spellCheck={false}
              />
            </label>
            <label className="load-panel__field load-panel__field--wide">
              <span>Explorer API key (optional)</span>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Helps when Sourcify has no match"
              />
            </label>
          </>
        ) : (
          <>
            <label className="load-panel__field load-panel__field--wide">
              <span>Address (optional — needed for live reads/writes)</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x…"
                spellCheck={false}
              />
            </label>
            <label className="load-panel__field load-panel__field--wide">
              <span>ABI or Foundry/Hardhat artifact (JSON)</span>
              <textarea
                value={abiText}
                onChange={(e) => setAbiText(e.target.value)}
                rows={8}
                placeholder='[{"type":"function","name":"…"}] or {"abi":[…]}'
                spellCheck={false}
              />
            </label>
          </>
        )}
      </div>

      {error ? <p className="load-panel__error">{error}</p> : null}

      <div className="load-panel__actions">
        <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="sd-btn sd-btn--write"
          onClick={() => void submit()}
          disabled={busy}
        >
          {busy ? 'Loading…' : mode === 'address' ? 'Resolve & open' : 'Open with this ABI'}
        </button>
      </div>
    </section>
  );
}
