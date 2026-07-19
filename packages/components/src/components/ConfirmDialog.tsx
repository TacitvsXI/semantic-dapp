import { useEffect, useState } from 'react';
import type { Permission, RiskLevel } from '@semantic-dapp/spec';

export interface ConfirmSummaryRow {
  label: string;
  value: string;
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Optional longer explanation of what will happen. */
  message?: string;
  risk?: RiskLevel;
  permission?: Permission;
  /** The exact function signature being called. */
  signature?: string;
  /** A human summary of the arguments. */
  summary?: ConfirmSummaryRow[];
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function permissionLabel(permission: Permission): string {
  switch (permission.kind) {
    case 'ownable':
      return 'Requires contract owner';
    case 'access-control':
      return permission.role ? `Requires role ${permission.role}` : 'Requires a privileged role';
    case 'custom':
      return 'Privileged (custom access control)';
    default:
      return 'No special permission';
  }
}

/**
 * Accessible confirmation modal for privileged/risky writes. Critical actions
 * require typing `CONFIRM` to proceed; Escape or the backdrop cancels. Purely
 * presentational — the caller decides when to open it and what to do on confirm.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  risk,
  permission,
  signature,
  summary,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const critical = risk === 'critical';
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmBlocked = critical && typed.trim().toUpperCase() !== 'CONFIRM';

  return (
    <div className="sd-modal" role="presentation" onClick={onCancel}>
      <div
        className="sd-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sd-modal__head">
          <h3 className="sd-modal__title">{title}</h3>
          {risk ? (
            <span className={`sd-badge sd-badge--risk sd-badge--risk-${risk}`}>{risk} risk</span>
          ) : null}
        </header>

        {message ? <p className="sd-modal__msg">{message}</p> : null}

        {signature ? (
          <code className="sd-modal__sig" data-testid="confirm-signature">
            {signature}
          </code>
        ) : null}

        {permission ? <p className="sd-modal__perm">{permissionLabel(permission)}</p> : null}

        {summary && summary.length > 0 ? (
          <dl className="sd-modal__summary">
            {summary.map((row) => (
              <div key={row.label} className="sd-modal__summary-row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {critical ? (
          <label className="sd-field sd-modal__gate">
            <span className="sd-field__name">
              Type <code>CONFIRM</code> to proceed
            </span>
            <input
              className="sd-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="CONFIRM"
              aria-label="Type CONFIRM to proceed"
            />
          </label>
        ) : null}

        <div className="sd-modal__actions">
          <button className="sd-btn sd-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="sd-btn sd-btn--write"
            onClick={onConfirm}
            disabled={confirmBlocked}
            data-testid="confirm-proceed"
          >
            {confirmLabel ?? 'Confirm & send'}
          </button>
        </div>
      </div>
    </div>
  );
}
