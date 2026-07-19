import { useState } from 'react';
import type { ContractFunction } from '@semantic-dapp/spec';
import { FunctionForm, ReadResultView, TxStatusView } from '@semantic-dapp/components';
import type { FormattedOutput } from '@semantic-dapp/execution';
import { decodeExecutionError } from '@semantic-dapp/execution';
import type { ContractRuntime } from './runtime.js';

export interface FunctionRunnerProps {
  func: ContractFunction;
  runtime: ContractRuntime;
  /** For write functions with elevated risk, require explicit confirmation. */
  requireConfirmation?: boolean;
  submitLabel?: string;
}

/**
 * Wire a single {@link ContractFunction} to the runtime: renders the form, runs
 * reads (showing results) or writes (showing tx state), and surfaces decoded
 * errors instead of failing silently.
 */
export function FunctionRunner({
  func,
  runtime,
  requireConfirmation,
  submitLabel,
}: FunctionRunnerProps) {
  const [readResult, setReadResult] = useState<FormattedOutput[] | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const txState = runtime.getTxState(func.signature);
  const needsWallet = !func.isRead && !runtime.wallet.isConnected;
  const blockedByConfirm = requireConfirmation && !confirmed;

  const handleSubmit = async (args: unknown[]) => {
    setBusy(true);
    setReadError(null);
    try {
      if (func.isRead) {
        const result = await runtime.callRead(func, args);
        setReadResult(result);
      } else {
        await runtime.submitWrite(func, args);
      }
    } catch (error) {
      const decoded = decodeExecutionError(error);
      setReadError(`${decoded.title}: ${decoded.detail}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sd-runner">
      {requireConfirmation ? (
        <label className="sd-runner__confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>I understand this is a sensitive action.</span>
        </label>
      ) : null}

      <FunctionForm
        func={func}
        onSubmit={handleSubmit}
        submitLabel={submitLabel}
        busy={busy}
        disabled={needsWallet || blockedByConfirm}
      />

      {needsWallet ? (
        <p className="sd-runner__hint">Connect a wallet to send this transaction.</p>
      ) : null}

      {func.isRead && readResult ? <ReadResultView result={readResult} /> : null}
      {readError ? <p className="sd-runner__error">{readError}</p> : null}
      {!func.isRead ? <TxStatusView state={txState} explorerUrl={runtime.explorerUrl} /> : null}
    </div>
  );
}
