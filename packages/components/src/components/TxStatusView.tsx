import type { TxState } from '@semantic-dapp/execution';

export interface TxStatusViewProps {
  state: TxState;
  /** Optional block explorer base URL for linking the tx hash. */
  explorerUrl?: string;
}

const PHASE_LABEL: Record<TxState['phase'], string> = {
  idle: '',
  simulating: 'Simulating…',
  estimating: 'Estimating gas…',
  'awaiting-signature': 'Confirm in your wallet…',
  pending: 'Transaction pending…',
  success: 'Confirmed',
  error: 'Failed',
};

/** Show the lifecycle of a write transaction, including decoded errors. */
export function TxStatusView({ state, explorerUrl }: TxStatusViewProps) {
  if (state.phase === 'idle') return null;

  return (
    <div className={`sd-tx sd-tx--${state.phase}`}>
      <span className="sd-tx__label">{PHASE_LABEL[state.phase]}</span>
      {state.gasEstimate !== undefined ? (
        <span className="sd-tx__gas">gas ≈ {state.gasEstimate.toString()}</span>
      ) : null}
      {state.hash ? (
        explorerUrl ? (
          <a
            className="sd-tx__hash"
            href={`${explorerUrl.replace(/\/$/, '')}/tx/${state.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            {state.hash}
          </a>
        ) : (
          <code className="sd-tx__hash">{state.hash}</code>
        )
      ) : null}
      {state.error ? (
        <div className="sd-tx__error">
          <strong>{state.error.title}</strong>
          <span>{state.error.detail}</span>
          {state.error.errorArgs && state.error.errorArgs.length > 0 ? (
            <code>({state.error.errorArgs.join(', ')})</code>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
