import { useCallback, useEffect, useState } from 'react';
import type { ContractFunction, ContractModel } from '@semantic-dapp/spec';
import { PausePanel, TxStatusView } from '@semantic-dapp/components';
import type { ContractRuntime } from '../runtime.js';
import { useConfirm } from '../useConfirm.js';

export interface PausePanelHostProps {
  model: ContractModel;
  runtime: ContractRuntime;
}

function findFn(model: ContractModel, signature: string): ContractFunction | undefined {
  return model.functions.find((f) => f.signature === signature);
}

function isBusy(runtime: ContractRuntime, fn?: ContractFunction): boolean {
  if (!fn) return false;
  const phase = runtime.getTxState(fn.signature).phase;
  return phase === 'pending' || phase === 'awaiting-signature' || phase === 'simulating';
}

/** Emergency pause console wired to the runtime (reads `paused()`, confirms writes). */
export function PausePanelHost({ model, runtime }: PausePanelHostProps) {
  const pauseFn = findFn(model, 'pause()');
  const unpauseFn = findFn(model, 'unpause()');
  const pausedFn = findFn(model, 'paused()');
  const { confirm, dialog } = useConfirm();

  const [paused, setPaused] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!pausedFn) return;
    setLoading(true);
    try {
      const out = await runtime.callRead(pausedFn, []);
      const value = out[0]?.value;
      setPaused(typeof value === 'string' ? value === 'true' : undefined);
    } catch {
      setPaused(undefined);
    } finally {
      setLoading(false);
    }
  }, [pausedFn, runtime]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (fn: ContractFunction | undefined, title: string, risk: 'high' | 'medium') => {
    if (!fn) return;
    const ok = await confirm({
      title,
      risk,
      signature: fn.signature,
      message:
        title === 'Pause'
          ? 'This halts state-changing operations for everyone.'
          : 'This resumes state-changing operations.',
    });
    if (!ok) return;
    await runtime.submitWrite(fn, []);
    void refresh();
  };

  const busy = isBusy(runtime, pauseFn) || isBusy(runtime, unpauseFn);

  return (
    <>
      {dialog}
      <PausePanel
        paused={paused}
        loading={loading}
        canPause={Boolean(pauseFn)}
        canUnpause={Boolean(unpauseFn)}
        busy={busy}
        onPause={() => void act(pauseFn, 'Pause', 'high')}
        onUnpause={() => void act(unpauseFn, 'Unpause', 'medium')}
        onRefresh={pausedFn ? () => void refresh() : undefined}
      />
      {pauseFn ? (
        <TxStatusView
          state={runtime.getTxState(pauseFn.signature)}
          explorerUrl={runtime.explorerUrl}
        />
      ) : null}
      {unpauseFn ? (
        <TxStatusView
          state={runtime.getTxState(unpauseFn.signature)}
          explorerUrl={runtime.explorerUrl}
        />
      ) : null}
    </>
  );
}
