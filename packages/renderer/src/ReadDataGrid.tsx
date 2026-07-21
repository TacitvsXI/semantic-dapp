import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContractFunction, ContractModel } from '@semantic-dapp/spec';
import { CopyButton, ReadResultView } from '@semantic-dapp/components';
import type { FormattedOutput } from '@semantic-dapp/execution';
import { decodeExecutionError } from '@semantic-dapp/execution';
import type { ContractRuntime } from './runtime.js';

type CellStatus = 'loading' | 'ok' | 'error';

interface Cell {
  status: CellStatus;
  outputs?: FormattedOutput[];
  error?: string;
}

/** No-argument view/pure getters — the contract's live "dashboard" data. */
export function noArgReads(model: ContractModel): ContractFunction[] {
  return model.functions.filter((f) => f.isRead && f.inputs.length === 0);
}

function scalarValue(outputs: FormattedOutput[] | undefined): string | null {
  if (!outputs || outputs.length !== 1) return null;
  const value = outputs[0]!.value;
  return typeof value === 'string' ? value : null;
}

export interface ReadDataGridProps {
  model: ContractModel;
  runtime: ContractRuntime;
  title?: string;
}

/**
 * Auto-calls every no-argument getter and renders the results as a live grid — a
 * one-glance dashboard of the contract's state (name, symbol, totalSupply,
 * paused, owner, …) instead of one form per getter. Each cell loads
 * independently, shows its own error with a retry, and there is a Refresh all.
 */
export function ReadDataGrid({ model, runtime, title = 'Live data' }: ReadDataGridProps) {
  const reads = useMemo(() => noArgReads(model), [model]);
  const [cells, setCells] = useState<Record<string, Cell>>({});

  const loadOne = useCallback(
    async (func: ContractFunction) => {
      setCells((prev) => ({ ...prev, [func.selector]: { status: 'loading' } }));
      try {
        const outputs = await runtime.callRead(func, []);
        setCells((prev) => ({ ...prev, [func.selector]: { status: 'ok', outputs } }));
      } catch (error) {
        const decoded = decodeExecutionError(error);
        setCells((prev) => ({
          ...prev,
          [func.selector]: { status: 'error', error: `${decoded.title}: ${decoded.detail}` },
        }));
      }
    },
    [runtime],
  );

  const loadAll = useCallback(() => {
    for (const func of reads) void loadOne(func);
  }, [reads, loadOne]);

  useEffect(() => {
    loadAll();
    // Reload when the contract (functions) or the read client changes.
  }, [loadAll]);

  if (reads.length === 0) return null;

  return (
    <section className="sd-card sd-readgrid">
      <header className="sd-card__header">
        <h3 className="sd-card__title">{title}</h3>
        <button type="button" className="sd-btn sd-btn--ghost" onClick={loadAll}>
          Refresh all
        </button>
      </header>

      <div className="sd-readgrid__grid">
        {reads.map((func) => {
          const cell = cells[func.selector];
          const scalar = scalarValue(cell?.outputs);
          return (
            <div key={func.selector} className="sd-readgrid__cell">
              <div className="sd-readgrid__key">
                <span className="sd-readgrid__name">{func.name}</span>
                <button
                  type="button"
                  className="sd-readgrid__refresh"
                  onClick={() => void loadOne(func)}
                  title="Refresh"
                  aria-label={`Refresh ${func.name}`}
                >
                  ↻
                </button>
              </div>

              {!cell || cell.status === 'loading' ? (
                <span className="sd-readgrid__skeleton" aria-hidden="true" />
              ) : cell.status === 'error' ? (
                <span className="sd-readgrid__error" title={cell.error}>
                  failed
                </span>
              ) : scalar !== null ? (
                <span className="sd-readgrid__value">
                  <code>{scalar === '' ? '∅' : scalar}</code>
                  {scalar.length > 0 ? <CopyButton value={scalar} label="Copy value" /> : null}
                </span>
              ) : (
                <div className="sd-readgrid__complex">
                  <ReadResultView result={cell.outputs ?? []} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
