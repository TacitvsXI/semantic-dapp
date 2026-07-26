import { useEffect, useState } from 'react';
import type {
  ContractFunction,
  InputWidget,
  Permission,
  RiskLevel,
  SafetyWarning,
} from '@semantic-dapp/spec';
import {
  FunctionForm,
  ReadResultView,
  TxStatusView,
  type AmountContext,
} from '@semantic-dapp/components';
import type { FormattedOutput, WritePreview } from '@semantic-dapp/execution';
import { decodeExecutionError } from '@semantic-dapp/execution';
import type { ContractRuntime } from './runtime.js';
import { useConfirm, summarizeArgs } from './useConfirm.js';
import { WritePreviewView } from './WritePreviewView.js';
import {
  buildExecutionEnvelope,
  encodeWriteCalldata,
  envelopesMatch,
  executionContextKey,
  type ExecutionEnvelope,
} from './executionEnvelope.js';

export interface RunnerConfirm {
  risk?: RiskLevel;
  permission?: Permission;
  title?: string;
  /** Preflight warnings surfaced in the confirmation modal. */
  warnings?: SafetyWarning[];
  /** Force typed CONFIRM even when risk is not critical (e.g. Raw writes). */
  requireTypedConfirm?: boolean;
}

export interface FunctionRunnerProps {
  func: ContractFunction;
  runtime: ContractRuntime;
  /** When set, gate the write behind a confirmation modal with these details. */
  confirm?: RunnerConfirm;
  /**
   * When true, writes require a successful Preview bound to an execution
   * envelope before Submit is enabled (Raw fail-closed).
   */
  requirePreview?: boolean;
  submitLabel?: string;
  /** Manifest widget hints, index-aligned with `func.inputs`. */
  hints?: (InputWidget | undefined)[];
  /** Token metadata for `token-amount` widgets. */
  amount?: AmountContext;
}

/**
 * Wire a single {@link ContractFunction} to the runtime: renders the form, runs
 * reads (showing results) or writes (showing tx state), gates sensitive writes
 * behind a confirmation modal, and surfaces decoded errors.
 */
export function FunctionRunner({
  func,
  runtime,
  confirm,
  requirePreview = false,
  submitLabel,
  hints,
  amount,
}: FunctionRunnerProps) {
  const [readResult, setReadResult] = useState<FormattedOutput[] | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<WritePreview | null>(null);
  const [previewArgs, setPreviewArgs] = useState<string[]>([]);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [boundEnvelope, setBoundEnvelope] = useState<ExecutionEnvelope | null>(null);
  const { confirm: askConfirm, dialog } = useConfirm();

  const txState = runtime.getTxState(func.signature);
  const needsWallet = !func.isRead && !runtime.wallet.isConnected;
  const canPreview = !func.isRead && typeof runtime.previewWrite === 'function';
  const previewGateActive = requirePreview && !func.isRead;
  const previewReady = !previewGateActive || (boundEnvelope !== null && preview?.success === true);

  const contextKey = executionContextKey({
    chainId: runtime.wallet.chainId,
    account: runtime.wallet.address,
    target: runtime.target,
    integrity: runtime.executionContext,
  });

  useEffect(() => {
    setPreview(null);
    setBoundEnvelope(null);
    setPreviewArgs([]);
  }, [contextKey]);

  const clearPreview = () => {
    setPreview(null);
    setBoundEnvelope(null);
    setPreviewArgs([]);
  };

  const envelopeFor = (args: unknown[], previewResult?: WritePreview | null) => {
    const calldata = previewResult?.calldata ?? encodeWriteCalldata(func, args);
    return buildExecutionEnvelope({
      signature: func.signature,
      args,
      calldata,
      chainId: runtime.wallet.chainId,
      account: runtime.wallet.address,
      to: runtime.target ?? previewResult?.to,
      value: previewResult?.value,
      integrity: runtime.executionContext,
      ...(previewResult?.simulationBlock !== undefined
        ? { simulationBlock: previewResult.simulationBlock }
        : {}),
    });
  };

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

  const handlePreview = async (args: unknown[]) => {
    if (!runtime.previewWrite) return;
    setPreviewBusy(true);
    setReadError(null);
    try {
      const result = await runtime.previewWrite(func, args);
      setPreview(result);
      setPreviewArgs(summarizeArgs(func.inputs, args).map((row) => `${row.label}: ${row.value}`));
      if (result.success) {
        setBoundEnvelope(envelopeFor(args, result));
      } else {
        setBoundEnvelope(null);
      }
    } catch (error) {
      const decoded = decodeExecutionError(error);
      setReadError(`${decoded.title}: ${decoded.detail}`);
      clearPreview();
    } finally {
      setPreviewBusy(false);
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

    if (previewGateActive) {
      if (!canPreview) {
        setReadError('Preview required before send, but preview is unavailable.');
        return;
      }
      // Rebuild from current args + integrity; calldata from re-encode must match
      // the bound preview calldata (ABI / arg / target drift fails closed).
      const current = buildExecutionEnvelope({
        signature: func.signature,
        args,
        calldata: encodeWriteCalldata(func, args),
        chainId: runtime.wallet.chainId,
        account: runtime.wallet.address,
        to: runtime.target ?? preview?.to,
        value: preview?.value,
        integrity: runtime.executionContext,
      });
      if (!preview?.success || !boundEnvelope || !envelopesMatch(boundEnvelope, current)) {
        setReadError(
          'Execution envelope changed. Run Preview again before send (args, network, account, target, or ABI/implementation may have drifted).',
        );
        clearPreview();
        return;
      }
    }

    if (confirm) {
      const ok = await askConfirm({
        title: confirm.title ?? func.name,
        risk: confirm.risk,
        permission: confirm.permission,
        signature: func.signature,
        summary: summarizeArgs(func.inputs, args),
        warnings: confirm.warnings,
        requireTypedConfirm: confirm.requireTypedConfirm,
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
        // Preview/dry-run works without a wallet (host simulates from zero address).
        // Only the submit button stays gated on connection + envelope.
        submitDisabled={needsWallet || (previewGateActive && !previewReady)}
        onFieldsChange={preview || boundEnvelope ? clearPreview : undefined}
        {...(hints !== undefined ? { hints } : {})}
        {...(amount !== undefined ? { amount } : {})}
        {...(canPreview
          ? { onSecondary: handlePreview, secondaryLabel: 'Preview', secondaryBusy: previewBusy }
          : {})}
      />

      {needsWallet ? (
        <p className="sd-runner__hint">Connect a wallet to send this transaction.</p>
      ) : null}

      {previewGateActive && !previewReady ? (
        <p className="sd-runner__hint" data-testid="preview-required-hint">
          {canPreview
            ? 'Preview required before send.'
            : 'Preview required before send, but preview is unavailable.'}
        </p>
      ) : null}

      {preview ? <WritePreviewView preview={preview} argSummary={previewArgs} /> : null}

      {func.isRead && readResult ? <ReadResultView result={readResult} /> : null}
      {readError ? <p className="sd-runner__error">{readError}</p> : null}
      {!func.isRead ? <TxStatusView state={txState} explorerUrl={runtime.explorerUrl} /> : null}
    </div>
  );
}
