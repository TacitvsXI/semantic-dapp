export interface PausePanelProps {
  /** Current on-chain paused state, if known. */
  paused?: boolean;
  loading?: boolean;
  /** Whether a `pause()` / `unpause()` entrypoint exists. */
  canPause?: boolean;
  canUnpause?: boolean;
  busy?: boolean;
  onPause?: () => void;
  onUnpause?: () => void;
  onRefresh?: () => void;
}

function statusText(paused: boolean | undefined, loading: boolean | undefined): string {
  if (loading) return 'Checking…';
  if (paused === undefined) return 'Unknown';
  return paused ? 'Paused' : 'Active';
}

function statusClass(paused: boolean | undefined): string {
  if (paused === undefined) return 'sd-pause__status--unknown';
  return paused ? 'sd-pause__status--paused' : 'sd-pause__status--active';
}

/**
 * Emergency pause console: shows the live paused state and offers the available
 * Pause / Unpause actions. Purely presentational — the host wires the calls (and
 * confirmation) via the runtime.
 */
export function PausePanel({
  paused,
  loading,
  canPause,
  canUnpause,
  busy,
  onPause,
  onUnpause,
  onRefresh,
}: PausePanelProps) {
  return (
    <section className="sd-card sd-pause">
      <header className="sd-card__header">
        <h3 className="sd-card__title">Pause control</h3>
        <span className={`sd-pause__status ${statusClass(paused)}`} data-testid="pause-status">
          {statusText(paused, loading)}
        </span>
      </header>

      <p className="sd-card__desc">
        Halt or resume state-changing operations. This is an emergency control and typically affects
        all users at once.
      </p>

      <div className="sd-pause__actions">
        {canPause ? (
          <button
            className="sd-btn sd-btn--emergency"
            onClick={onPause}
            disabled={busy || paused === true}
          >
            Pause
          </button>
        ) : null}
        {canUnpause ? (
          <button
            className="sd-btn sd-btn--write"
            onClick={onUnpause}
            disabled={busy || paused === false}
          >
            Unpause
          </button>
        ) : null}
        {onRefresh ? (
          <button className="sd-btn sd-btn--ghost" onClick={onRefresh} disabled={loading}>
            Refresh
          </button>
        ) : null}
      </div>
    </section>
  );
}
