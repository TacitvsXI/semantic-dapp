import { useState } from 'react';
import type { ContractFunction, Permission, RiskLevel } from '@semantic-dapp/spec';
import { FunctionForm, ReadResultView, TxStatusView } from '@semantic-dapp/components';
import type { FormattedOutput } from '@semantic-dapp/execution';
import { decodeExecutionError } from '@semantic-dapp/execution';
import type { ContractRuntime } from './runtime.js';
import { useConfirm, summarizeArgs } from './useConfirm.js';

export interface RunnerConfirm {
  risk?: RiskLevel;
  permission?: Permission;
  title?: string;
}

export interface FunctionRunnerProps {
  func: ContractFunction;
  runtime: ContractRuntime;
  /** When set, gate the write behind a confirmation modal with these details. */
  confirm?: RunnerConfirm;
  submitLabel?: string;
}

/**
 * Wire a single {@link ContractFunction} to the runtime: renders the form, runs
 * reads (showing results) or writes (showing tx state), gates sensitive writes
 * behind a confirmation modal, and surfaces decoded errors.
 */
export function FunctionRunner({ func, runtime, confirm, submitLabel }: FunctionRunnerProps) {
  const [readResult, setReadResult] = useState<FormattedOutput[] | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { confirm: askConfirm, dialog } = useConfirm();

  const txState = runtime.getTxState(func.signature);
  const needsWallet = !func.isRead && !runtime.wallet.isConnected;

  const runWrite = async (args: unknown[]) => {
    setBusy(true);
    setReadError(null);
    try {
      await runtime.submitWrite(func, args);
    } catch (error) {
      const decoded = decodeExecutionError(error);
      setReadError(`${decoded.title}: ${decoded.detail}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (args: unknown[]) => {
    if (func.isRead) {
      setBusy(true);
      setReadError(null);
      try {
        setReadResult(await runtime.callRead(func, args));
      } catch (error) {
        const decoded = decodeExecutionError(error);
        setReadError(`${decoded.title}: ${decoded.detail}`);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (confirm) {
      const ok = await askConfirm({
        title: confirm.title ?? func.name,
        risk: confirm.risk,
        permission: confirm.permission,
        signature: func.signature,
        summary: summarizeArgs(func.inputs, args),
      });
      if (!ok) return;
    }
    await runWrite(args);
  };

  return (
    <div className="sd-runner">
      {dialog}

      <FunctionForm
        func={func}
        onSubmit={handleSubmit}
        submitLabel={submitLabel}
        busy={busy}
        disabled={needsWallet}
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
