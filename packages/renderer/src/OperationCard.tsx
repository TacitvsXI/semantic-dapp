import { writeWarnings, type ContractFunction } from '@semantic-dapp/spec';
import {
  AudienceBadge,
  ConfidenceBadge,
  EvidenceList,
  RiskBadge,
  type AmountContext,
} from '@semantic-dapp/components';
import type { OperationView } from './sections.js';
import type { ContractRuntime } from './runtime.js';
import { FunctionRunner } from './FunctionRunner.js';

export interface ReviewControls {
  onConfirm: (operationId: string) => void;
  onMoveToRaw: (operationId: string) => void;
}

/** Contract-level safety context used to compute preflight write warnings. */
export interface SafetyContext {
  contractChainId?: number;
  verified?: boolean;
  stale?: boolean;
}

export interface OperationCardProps {
  view: OperationView;
  runtime: ContractRuntime;
  review?: ReviewControls;
  safety?: SafetyContext;
  /** Token metadata used to render `token-amount` inputs in human units. */
  amount?: AmountContext;
}

/** A semantic operation: title, badges (audience/confidence/risk), evidence and form. */
export function OperationCard({ view, runtime, review, safety, amount }: OperationCardProps) {
  const { operation, func } = view;
  const hints = operation.inputs.map((input) => input.widget);
  const risk = operation.risk?.level;
  const privileged = operation.permission !== undefined && operation.permission.kind !== 'none';
  const warnings = operation.isRead
    ? []
    : writeWarnings({
        walletChainId: runtime.wallet.chainId,
        contractChainId: safety?.contractChainId,
        verified: safety?.verified,
        stale: safety?.stale,
        risk,
      });
  const needsConfirm = risk === 'high' || risk === 'critical' || privileged || warnings.length > 0;
  const confirm = needsConfirm
    ? { risk, permission: operation.permission, title: operation.title, warnings }
    : undefined;

  return (
    <section className="sd-card sd-op-card">
      <header className="sd-card__header">
        <div>
          <h3 className="sd-card__title">
            {operation.title}
            {operation.reviewed ? <span className="sd-card__reviewed">✓ reviewed</span> : null}
          </h3>
          <code className="sd-card__sig">{operation.function}</code>
        </div>
        <div className="sd-card__badges">
          <AudienceBadge audience={operation.audience} />
          <ConfidenceBadge confidence={operation.confidence} />
          {operation.risk ? (
            <RiskBadge level={operation.risk.level} reason={operation.risk.reason} />
          ) : null}
        </div>
      </header>

      {operation.description ? <p className="sd-card__desc">{operation.description}</p> : null}

      <EvidenceList evidence={operation.evidence} />

      {review ? (
        <div className="sd-card__review">
          {!operation.reviewed ? (
            <button className="sd-btn sd-btn--ghost" onClick={() => review.onConfirm(operation.id)}>
              Confirm
            </button>
          ) : null}
          <button className="sd-btn sd-btn--ghost" onClick={() => review.onMoveToRaw(operation.id)}>
            Move to Raw
          </button>
        </div>
      ) : null}

      {func ? (
        <FunctionRunner
          func={func}
          runtime={runtime}
          confirm={confirm}
          hints={hints}
          {...(amount !== undefined ? { amount } : {})}
        />
      ) : (
        <MissingFunctionNotice signature={operation.function} />
      )}
    </section>
  );
}

function MissingFunctionNotice({ signature }: { signature: string }) {
  return (
    <p className="sd-card__missing">
      The function <code>{signature}</code> from this operation was not found in the ABI.
    </p>
  );
}

export interface RawFunctionCardProps {
  func: ContractFunction;
  runtime: ContractRuntime;
}

/** A raw ABI function card (lossless fallback). */
export function RawFunctionCard({ func, runtime }: RawFunctionCardProps) {
  return (
    <section className="sd-card sd-raw-card">
      <header className="sd-card__header">
        <div>
          <h3 className="sd-card__title">{func.name}</h3>
          <code className="sd-card__sig">{func.signature}</code>
        </div>
        <div className="sd-card__badges">
          <span className={`sd-badge ${func.isRead ? 'sd-badge--read' : 'sd-badge--write'}`}>
            {func.isRead ? 'read' : 'write'}
          </span>
          {func.isPayable ? <span className="sd-badge sd-badge--payable">payable</span> : null}
        </div>
      </header>
      <FunctionRunner func={func} runtime={runtime} />
    </section>
  );
}
