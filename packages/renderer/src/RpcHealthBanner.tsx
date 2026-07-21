import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContractModel } from '@semantic-dapp/spec';
import { decodeExecutionError } from '@semantic-dapp/execution';
import type { ContractRuntime } from './runtime.js';
import { noArgReads } from './ReadDataGrid.js';

type Health = 'checking' | 'ok' | 'unreachable';

export interface RpcHealthBannerProps {
  model: ContractModel;
  runtime: ContractRuntime;
  /** The chain the contract lives on, for a precise message. */
  chainId?: number;
}

/**
 * Probes connectivity with one cheap no-argument read and, when the RPC is
 * unreachable (a network error, not a contract revert), shows a banner that
 * tells the user how to recover - connect a wallet on the contract's chain, or
 * set a custom RPC. This distinguishes "can't reach the chain" from silently
 * empty reads or a genuine revert (which surface per-cell in the read grid).
 */
export function RpcHealthBanner({ model, runtime, chainId }: RpcHealthBannerProps) {
  const probe = useMemo(() => noArgReads(model)[0], [model]);
  const [health, setHealth] = useState<Health>('checking');

  const { isConnected, chainId: walletChainId } = runtime.wallet;
  const onContractChain =
    isConnected &&
    chainId !== undefined &&
    walletChainId !== undefined &&
    walletChainId === chainId;

  const check = useCallback(async () => {
    if (!probe) {
      setHealth('ok');
      return;
    }
    setHealth('checking');
    try {
      await runtime.callRead(probe, []);
      setHealth('ok');
    } catch (error) {
      // Only a transport/network failure means "RPC unreachable"; a revert or
      // custom error means the chain answered, so the RPC is fine.
      setHealth(decodeExecutionError(error).kind === 'network' ? 'unreachable' : 'ok');
    }
  }, [probe, runtime]);

  // Re-probe on mount and whenever the wallet connection/chain changes, so
  // connecting a wallet (which adds a fallback transport) clears the banner.
  useEffect(() => {
    void check();
  }, [check, isConnected, walletChainId]);

  if (!probe || health !== 'unreachable') return null;

  return (
    <div className="sd-rpc-banner" role="alert">
      <div className="sd-rpc-banner__text">
        <strong>
          Can&apos;t reach the RPC{chainId !== undefined ? ` for chain ${chainId}` : ''}.
        </strong>{' '}
        {onContractChain
          ? 'Both the configured RPC and your wallet failed to respond. Try again, or set a custom RPC.'
          : 'Connect a wallet on this chain (or set a custom RPC) to load on-chain data.'}
      </div>
      <div className="sd-rpc-banner__actions">
        {!isConnected ? (
          <button
            type="button"
            className="sd-btn sd-btn--ghost"
            onClick={() => runtime.wallet.connect()}
          >
            Connect wallet
          </button>
        ) : !onContractChain && runtime.wallet.switchChain ? (
          <button
            type="button"
            className="sd-btn sd-btn--ghost"
            onClick={() => runtime.wallet.switchChain?.()}
          >
            Switch network
          </button>
        ) : null}
        <button type="button" className="sd-btn sd-btn--ghost" onClick={() => void check()}>
          Retry
        </button>
      </div>
    </div>
  );
}
