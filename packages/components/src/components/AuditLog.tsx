export interface AuditEntry {
  id: string;
  timestamp: number;
  /** Function signature that was executed. */
  function: string;
  status: 'success' | 'error';
  hash?: string;
  chainId?: number;
  detail?: string;
}

export interface AuditLogProps {
  entries: AuditEntry[];
  explorerUrl?: string;
  onClear?: () => void;
  onExport?: () => void;
}

function shortHash(hash?: string): string {
  if (!hash) return '—';
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash;
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

/** Local, append-only execution history (audit trail). Presentational. */
export function AuditLog({ entries, explorerUrl, onClear, onExport }: AuditLogProps) {
  return (
    <section className="sd-card sd-audit">
      <header className="sd-card__header">
        <h3 className="sd-card__title">Execution history</h3>
        <div className="sd-audit__actions">
          {onExport ? (
            <button
              className="sd-btn sd-btn--ghost"
              onClick={onExport}
              disabled={entries.length === 0}
            >
              Export
            </button>
          ) : null}
          {onClear ? (
            <button
              className="sd-btn sd-btn--ghost"
              onClick={onClear}
              disabled={entries.length === 0}
            >
              Clear
            </button>
          ) : null}
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="sd-empty">No transactions recorded yet.</p>
      ) : (
        <table className="sd-audit__table">
          <thead>
            <tr>
              <th>When</th>
              <th>Function</th>
              <th>Status</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatTime(entry.timestamp)}</td>
                <td>
                  <code>{entry.function}</code>
                </td>
                <td>
                  <span className={`sd-badge sd-audit__status--${entry.status}`}>
                    {entry.status}
                  </span>
                </td>
                <td>
                  {entry.hash && explorerUrl ? (
                    <a href={`${explorerUrl}/tx/${entry.hash}`} target="_blank" rel="noreferrer">
                      {shortHash(entry.hash)}
                    </a>
                  ) : (
                    shortHash(entry.hash)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
