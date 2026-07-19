import type { Hash } from 'viem';
import type { DecodedExecutionError } from './errors.js';

/** Lifecycle of a write transaction, surfaced in the UI. */
export type TxPhase =
  'idle' | 'simulating' | 'estimating' | 'awaiting-signature' | 'pending' | 'success' | 'error';

export interface TxState {
  phase: TxPhase;
  hash?: Hash;
  gasEstimate?: bigint;
  error?: DecodedExecutionError;
}

export const idleTxState: TxState = { phase: 'idle' };

/** Whether a transaction is currently in flight (any non-terminal active phase). */
export function isTxBusy(state: TxState): boolean {
  return (
    state.phase === 'simulating' ||
    state.phase === 'estimating' ||
    state.phase === 'awaiting-signature' ||
    state.phase === 'pending'
  );
}
