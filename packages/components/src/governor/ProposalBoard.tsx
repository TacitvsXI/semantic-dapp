import { useState } from 'react';
import { AddressView } from '../components/AddressView.js';
import { proposalStateName, type ProposalStateName } from './GovernorPanel.js';

export interface ProposalRow {
  /** Proposal id as a decimal string. */
  id: string;
  /** OZ IGovernor.ProposalState numeric value. */
  state?: number;
  proposer?: string;
  /** Vote-start block/timepoint. */
  snapshot?: string;
  /** Vote-end block/timepoint. */
  deadline?: string;
  /** Whether the connected account has voted. */
  hasVoted?: boolean;
  loading?: boolean;
  error?: string;
}

export interface ProposalBoardProps {
  items: ProposalRow[];
  explorerUrl?: string;
  onAdd?: (id: string) => void;
  onRefresh?: () => void;
}

/** Map a proposal state to a tone class for the badge. */
function stateTone(state: number | undefined): string {
  if (state === undefined) return '';
  const name = proposalStateName(state) as ProposalStateName;
  if (name === 'Succeeded' || name === 'Executed' || name === 'Queued') return 'sd-pstate--ok';
  if (name === 'Active' || name === 'Pending') return 'sd-pstate--active';
  return 'sd-pstate--muted';
}

/** Read-only board that tracks proposal ids and shows their live state. */
export function ProposalBoard({ items, explorerUrl, onAdd, onRefresh }: ProposalBoardProps) {
  const [idInput, setIdInput] = useState('');

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const id = idInput.trim();
    if (id === '' || !/^\d+$/.test(id) || !onAdd) return;
    onAdd(id);
    setIdInput('');
  };

  return (
    <section className="sd-card sd-board">
      <header className="sd-card__header">
        <div>
          <h3 className="sd-card__title">Proposal board</h3>
          <code className="sd-card__sig">track proposals by id</code>
        </div>
        <div className="sd-nft__toolbar">
          {onAdd ? (
            <form className="sd-nft__add" onSubmit={add}>
              <input
                className="sd-input"
                inputMode="numeric"
                placeholder="proposal id"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                aria-label="Proposal id to track"
              />
              <button type="submit" className="sd-btn sd-btn--ghost">
                Track
              </button>
            </form>
          ) : null}
          {onRefresh ? (
            <button type="button" className="sd-btn sd-btn--ghost" onClick={onRefresh}>
              Refresh
            </button>
          ) : null}
        </div>
      </header>

      {items.length === 0 ? (
        <p className="sd-empty">Track a proposal id to see its state, proposer and timing.</p>
      ) : (
        <div className="sd-board__rows">
          {items.map((row) => (
            <div className="sd-board__row" key={row.id}>
              <div className="sd-board__main">
                <span className="sd-board__id">#{row.id}</span>
                {row.state !== undefined ? (
                  <span className={`sd-badge sd-pstate ${stateTone(row.state)}`}>
                    {proposalStateName(row.state)}
                  </span>
                ) : row.loading ? (
                  <span className="sd-field__hint">Loading…</span>
                ) : row.error ? (
                  <span className="sd-field__warn">{row.error}</span>
                ) : null}
                {row.hasVoted !== undefined ? (
                  <span className="sd-board__voted">{row.hasVoted ? '✓ voted' : 'not voted'}</span>
                ) : null}
              </div>
              <dl className="sd-board__meta">
                {row.proposer ? (
                  <div>
                    <dt>Proposer</dt>
                    <dd>
                      <AddressView
                        address={row.proposer}
                        {...(explorerUrl ? { explorerUrl } : {})}
                      />
                    </dd>
                  </div>
                ) : null}
                {row.snapshot ? (
                  <div>
                    <dt>Vote start</dt>
                    <dd>{row.snapshot}</dd>
                  </div>
                ) : null}
                {row.deadline ? (
                  <div>
                    <dt>Vote end</dt>
                    <dd>{row.deadline}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
