import { useState } from 'react';
import { getAddress, isAddress, isHex, keccak256, toBytes } from 'viem';

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

export interface RoleManagerProps {
  canGrant?: boolean;
  canRevoke?: boolean;
  canRenounce?: boolean;
  /** The connected wallet, used as the default account for renounce. */
  connectedAddress?: string;
  busy?: boolean;
  onGrant?: (role: `0x${string}`, account: `0x${string}`) => void;
  onRevoke?: (role: `0x${string}`, account: `0x${string}`) => void;
  onRenounce?: (role: `0x${string}`, account: `0x${string}`) => void;
}

function isBytes32(value: string): value is `0x${string}` {
  return isHex(value) && value.length === 66;
}

/**
 * AccessControl role console: grant / revoke / renounce a role for an account.
 * Roles can be entered as a raw bytes32 or as a human name that is hashed with
 * keccak256 (the OpenZeppelin convention). Presentational — the host wires calls.
 */
export function RoleManager({
  canGrant,
  canRevoke,
  canRenounce,
  connectedAddress,
  busy,
  onGrant,
  onRevoke,
  onRenounce,
}: RoleManagerProps) {
  const [role, setRole] = useState('');
  const [hashName, setHashName] = useState(false);
  const [account, setAccount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resolveRole = (): `0x${string}` | undefined => {
    const raw = role.trim();
    if (!raw) {
      setError('Enter a role (bytes32 or a name to hash).');
      return undefined;
    }
    if (hashName) return keccak256(toBytes(raw));
    if (!isBytes32(raw)) {
      setError('Role must be a 32-byte hex value (0x…) or enable "hash name".');
      return undefined;
    }
    return raw;
  };

  const resolveAccount = (fallback?: string): `0x${string}` | undefined => {
    const raw = (account.trim() || fallback || '').trim();
    if (!isAddress(raw)) {
      setError('Enter a valid account address.');
      return undefined;
    }
    return getAddress(raw);
  };

  const run = (
    handler: ((role: `0x${string}`, account: `0x${string}`) => void) | undefined,
    useConnectedFallback = false,
  ) => {
    setError(null);
    if (!handler) return;
    const resolvedRole = resolveRole();
    if (!resolvedRole) return;
    const resolvedAccount = resolveAccount(useConnectedFallback ? connectedAddress : undefined);
    if (!resolvedAccount) return;
    handler(resolvedRole, resolvedAccount);
  };

  return (
    <section className="sd-card sd-roles">
      <header className="sd-card__header">
        <h3 className="sd-card__title">Role manager</h3>
      </header>
      <p className="sd-card__desc">
        Grant, revoke or renounce access-control roles. Changing roles changes who can perform
        privileged actions.
      </p>

      <label className="sd-field">
        <span className="sd-field__name">Role</span>
        <input
          className="sd-input"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder={hashName ? 'MINTER_ROLE' : `${DEFAULT_ADMIN_ROLE.slice(0, 10)}…`}
        />
      </label>
      <label className="sd-bool sd-roles__hash">
        <input type="checkbox" checked={hashName} onChange={(e) => setHashName(e.target.checked)} />
        <span>Hash name with keccak256 (OpenZeppelin style)</span>
      </label>
      <button
        type="button"
        className="sd-btn sd-btn--ghost sd-roles__preset"
        onClick={() => {
          setHashName(false);
          setRole(DEFAULT_ADMIN_ROLE);
        }}
      >
        Use DEFAULT_ADMIN_ROLE
      </button>

      <label className="sd-field">
        <span className="sd-field__name">Account</span>
        <input
          className="sd-input"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="0x…"
        />
      </label>

      {error ? <p className="sd-field__error">{error}</p> : null}

      <div className="sd-roles__actions">
        {canGrant ? (
          <button className="sd-btn sd-btn--write" disabled={busy} onClick={() => run(onGrant)}>
            Grant
          </button>
        ) : null}
        {canRevoke ? (
          <button
            className="sd-btn sd-btn--emergency"
            disabled={busy}
            onClick={() => run(onRevoke)}
          >
            Revoke
          </button>
        ) : null}
        {canRenounce ? (
          <button
            className="sd-btn sd-btn--ghost"
            disabled={busy}
            onClick={() => run(onRenounce, true)}
          >
            Renounce (self)
          </button>
        ) : null}
      </div>
    </section>
  );
}
