import { useState } from 'react';
import { isAddress, getAddress } from 'viem';
import { parseTokenAmount } from '../erc20/amount.js';

export type ProposalStateName =
  'Pending' | 'Active' | 'Canceled' | 'Defeated' | 'Succeeded' | 'Queued' | 'Expired' | 'Executed';

/** OZ IGovernor.ProposalState ordering. */
export const PROPOSAL_STATES: ProposalStateName[] = [
  'Pending',
  'Active',
  'Canceled',
  'Defeated',
  'Succeeded',
  'Queued',
  'Expired',
  'Executed',
];

export function proposalStateName(state: number): string {
  return PROPOSAL_STATES[state] ?? `State ${state}`;
}

interface ActionRow {
  target: string;
  value: string;
  calldata: string;
}

const VOTE_OPTIONS = [
  { support: 0, label: 'Against' },
  { support: 1, label: 'For' },
  { support: 2, label: 'Abstain' },
] as const;

export interface GovernorPanelProps {
  busy?: { propose?: boolean; vote?: boolean };
  /** Whether a `castVoteWithReason` variant exists (enables the reason field). */
  canVoteWithReason?: boolean;
  onPropose: (
    targets: `0x${string}`[],
    values: bigint[],
    calldatas: `0x${string}`[],
    description: string,
  ) => void;
  onVote: (proposalId: bigint, support: number, reason?: string) => void;
  /** Optional live proposal-state lookup. */
  onCheckState?: (proposalId: bigint) => Promise<number | undefined>;
}

function parseHex(raw: string): `0x${string}` | null {
  const t = raw.trim() === '' ? '0x' : raw.trim();
  if (!/^0x[0-9a-fA-F]*$/.test(t) || t.length % 2 !== 0) return null;
  return t as `0x${string}`;
}

/**
 * Semantic Governor console: a proposal builder (index-aligned target / value /
 * calldata rows + description) and a vote helper (proposal id + For/Against/
 * Abstain, optional reason, live state lookup). Replaces the raw triple-array
 * `propose` form and the bare `castVote` uint8.
 */
export function GovernorPanel({
  busy,
  canVoteWithReason,
  onPropose,
  onVote,
  onCheckState,
}: GovernorPanelProps) {
  const [tab, setTab] = useState<'propose' | 'vote'>('propose');

  // Propose state.
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<ActionRow[]>([{ target: '', value: '', calldata: '0x' }]);
  const [proposeError, setProposeError] = useState<string | null>(null);

  // Vote state.
  const [proposalId, setProposalId] = useState('');
  const [support, setSupport] = useState(1);
  const [reason, setReason] = useState('');
  const [voteError, setVoteError] = useState<string | null>(null);
  const [stateLabel, setStateLabel] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const setRow = (i: number, patch: Partial<ActionRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { target: '', value: '', calldata: '0x' }]);
  const removeRow = (i: number) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const submitPropose = (event: React.FormEvent) => {
    event.preventDefault();
    setProposeError(null);
    if (description.trim() === '') {
      setProposeError('A proposal description is required.');
      return;
    }
    const targets: `0x${string}`[] = [];
    const values: bigint[] = [];
    const calldatas: `0x${string}`[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!;
      if (!isAddress(row.target.trim())) {
        setProposeError(`Action ${i + 1}: invalid target address.`);
        return;
      }
      const parsedValue =
        row.value.trim() === '' ? { ok: true, value: 0n } : parseTokenAmount(row.value, 18);
      if (!parsedValue.ok || parsedValue.value === undefined) {
        setProposeError(`Action ${i + 1}: invalid value (ETH).`);
        return;
      }
      const calldata = parseHex(row.calldata);
      if (calldata === null) {
        setProposeError(`Action ${i + 1}: invalid calldata (hex).`);
        return;
      }
      targets.push(getAddress(row.target.trim()));
      values.push(parsedValue.value);
      calldatas.push(calldata);
    }
    onPropose(targets, values, calldatas, description);
  };

  const parseProposalId = (): bigint | null => {
    const t = proposalId.trim();
    if (t === '' || !/^\d+$/.test(t)) return null;
    try {
      return BigInt(t);
    } catch {
      return null;
    }
  };

  const submitVote = (event: React.FormEvent) => {
    event.preventDefault();
    setVoteError(null);
    const id = parseProposalId();
    if (id === null) {
      setVoteError('Enter a valid proposal id.');
      return;
    }
    const trimmedReason = reason.trim();
    onVote(id, support, canVoteWithReason && trimmedReason !== '' ? trimmedReason : undefined);
  };

  const checkState = async () => {
    setStateLabel(null);
    const id = parseProposalId();
    if (id === null || !onCheckState) {
      setVoteError('Enter a valid proposal id.');
      return;
    }
    setChecking(true);
    try {
      const state = await onCheckState(id);
      setStateLabel(state === undefined ? 'unavailable' : proposalStateName(state));
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="sd-card sd-gov">
      <header className="sd-card__header">
        <div>
          <h3 className="sd-card__title">Governance</h3>
        </div>
        <span className="sd-badge sd-chip">Governor</span>
      </header>

      <div className="sd-vault__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'propose'}
          className={`sd-vault__tab ${tab === 'propose' ? 'sd-vault__tab--active' : ''}`}
          onClick={() => setTab('propose')}
        >
          Propose
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'vote'}
          className={`sd-vault__tab ${tab === 'vote' ? 'sd-vault__tab--active' : ''}`}
          onClick={() => setTab('vote')}
        >
          Vote
        </button>
      </div>

      {tab === 'propose' ? (
        <form className="sd-token-form" onSubmit={submitPropose}>
          <label className="sd-field">
            <span className="sd-field__name">Description</span>
            <textarea
              className="sd-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this proposal do?"
            />
          </label>

          <div className="sd-gov__actions">
            <span className="sd-field__name">Actions</span>
            {rows.map((row, i) => (
              <div className="sd-gov__action" key={i}>
                <input
                  className="sd-input"
                  placeholder="target 0x…"
                  value={row.target}
                  onChange={(e) => setRow(i, { target: e.target.value })}
                />
                <div className="sd-gov__action-line">
                  <input
                    className="sd-input"
                    inputMode="decimal"
                    placeholder="value (ETH)"
                    value={row.value}
                    onChange={(e) => setRow(i, { value: e.target.value })}
                  />
                  <input
                    className="sd-input"
                    placeholder="calldata 0x…"
                    value={row.calldata}
                    onChange={(e) => setRow(i, { calldata: e.target.value })}
                  />
                  <button
                    type="button"
                    className="sd-btn sd-btn--ghost"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                    aria-label={`Remove action ${i + 1}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="sd-btn sd-btn--ghost" onClick={addRow}>
              + Add action
            </button>
          </div>

          {proposeError ? <p className="sd-field__error">{proposeError}</p> : null}
          <button type="submit" className="sd-btn sd-btn--write" disabled={busy?.propose}>
            {busy?.propose ? 'Working…' : 'Create proposal'}
          </button>
        </form>
      ) : (
        <form className="sd-token-form" onSubmit={submitVote}>
          <label className="sd-field">
            <span className="sd-field__name">Proposal id</span>
            <div className="sd-gov__action-line">
              <input
                className="sd-input"
                inputMode="numeric"
                placeholder="proposal id"
                value={proposalId}
                onChange={(e) => setProposalId(e.target.value)}
              />
              {onCheckState ? (
                <button
                  type="button"
                  className="sd-btn sd-btn--ghost"
                  onClick={() => void checkState()}
                  disabled={checking}
                >
                  {checking ? 'Checking…' : 'Check state'}
                </button>
              ) : null}
            </div>
          </label>
          {stateLabel ? (
            <p className="sd-field__hint">
              State: <strong>{stateLabel}</strong>
            </p>
          ) : null}

          <label className="sd-field">
            <span className="sd-field__name">Vote</span>
            <select
              className="sd-input"
              value={support}
              onChange={(e) => setSupport(Number(e.target.value))}
            >
              {VOTE_OPTIONS.map((o) => (
                <option key={o.support} value={o.support}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {canVoteWithReason ? (
            <label className="sd-field">
              <span className="sd-field__name">Reason (optional)</span>
              <textarea
                className="sd-input"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you voting this way?"
              />
            </label>
          ) : null}

          {voteError ? <p className="sd-field__error">{voteError}</p> : null}
          <button type="submit" className="sd-btn sd-btn--write" disabled={busy?.vote}>
            {busy?.vote ? 'Working…' : 'Cast vote'}
          </button>
        </form>
      )}
    </section>
  );
}
