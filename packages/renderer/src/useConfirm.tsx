import { useCallback, useState } from 'react';
import type { Permission, RiskLevel } from '@semantic-dapp/spec';
import { ConfirmDialog, type ConfirmSummaryRow } from '@semantic-dapp/components';

export interface ConfirmMeta {
  title: string;
  message?: string;
  risk?: RiskLevel;
  permission?: Permission;
  signature?: string;
  summary?: ConfirmSummaryRow[];
  confirmLabel?: string;
}

interface Pending {
  meta: ConfirmMeta;
  resolve: (ok: boolean) => void;
}

/**
 * Promise-based confirmation backed by a single {@link ConfirmDialog}. Call
 * `confirm(meta)` to open the modal; it resolves `true` on confirm and `false`
 * on cancel. Render the returned `dialog` once in the component tree.
 */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (meta: ConfirmMeta) => new Promise<boolean>((resolve) => setPending({ meta, resolve })),
    [],
  );

  const settle = (ok: boolean) => {
    setPending((current) => {
      current?.resolve(ok);
      return null;
    });
  };

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      title={pending?.meta.title ?? ''}
      message={pending?.meta.message}
      risk={pending?.meta.risk}
      permission={pending?.meta.permission}
      signature={pending?.meta.signature}
      summary={pending?.meta.summary}
      confirmLabel={pending?.meta.confirmLabel}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, dialog };
}

/** Build a readable argument summary for the confirmation modal. */
export function summarizeArgs(inputs: { name: string }[], args: unknown[]): ConfirmSummaryRow[] {
  return inputs.map((input, index) => ({
    label: input.name || `arg${index}`,
    value: stringifyArg(args[index]),
  }));
}

function stringifyArg(value: unknown): string {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return `[${value.map(stringifyArg).join(', ')}]`;
  if (value === undefined || value === null) return '';
  return String(value);
}
