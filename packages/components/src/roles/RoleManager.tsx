import { useEffect, useState } from 'react';
import { getAddress, isAddress, isHex, keccak256, toBytes } from 'viem';

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CUSTOM_ROLE = '__custom__';

/** A role discovered from the contract: a human name mapped to its bytes32 id. */
export interface RoleOption {
  name: string;
  value: `0x${string}`;
}

export interface RoleManagerProps {
  canGrant?: boolean;
  canRevoke?: boolean;
  canRenounce?: boolean;
  /** The connected wallet, used as the default account for renounce. */
  connectedAddress?: string;
  busy?: boolean;
  /**
   * Roles discovered from the contract (name → bytes32). When present, the user
   * picks a role by name from a dropdown instead of pasting a hash; a "Custom…"
   * option still allows a raw bytes32 / hashed name.
   */
  roles?: RoleOption[];
  /**
   * Resolve which discovered roles an account currently holds (name → held).
   * When provided, the manager shows membership badges for the entered account
   * and disables no-op grant/revoke. Should be stable (memoized) by the host.
   */
  checkMembership?: (account: `0x${string}`) => Promise<Record<string, boolean>>;
  onGrant?: (role: `0x${string}`, account: `0x${string}`) => void;
  onRevoke?: (role: `0x${string}`, account: `0x${string}`) => void;
  onRenounce?: (role: `0x${string}`, account: `0x${string}`) => void;
}

function isBytes32(value: string): value is `0x${string}` {
  return isHex(value) && value.length === 66;
}

/**
 * AccessControl role console: grant / revoke / renounce a role for an account.
 * When the host supplies the contract's `roles`, the role is chosen by name from
 * a dropdown (values read from the contract); otherwise a role can be entered as
 * a raw bytes32 or a human name hashed with keccak256 (the OpenZeppelin
 * convention). Presentational — the host wires the calls.
 */
export function RoleManager({
  canGrant,
  canRevoke,
  canRenounce,
  connectedAddress,
  busy,
  roles,
  checkMembership,
  onGrant,
  onRevoke,
  onRenounce,
}: RoleManagerProps) {
  const [role, setRole] = useState('');
  const [hashName, setHashName] = useState(false);
  const [account, setAccount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState('');
  const [membership, setMembership] = useState<Record<string, boolean> | null>(null);

  const knownRoles = roles ?? [];
  const hasKnownRoles = knownRoles.length > 0;
  const effectiveSelected = selected || (hasKnownRoles ? knownRoles[0]!.name : CUSTOM_ROLE);
  const isCustom = effectiveSelected === CUSTOM_ROLE;
  const knownRole = hasKnownRoles
    ? knownRoles.find((r) => r.name === effectiveSelected)
    : undefined;

  // Look up which roles the entered account holds (debounced), so the user sees
  // current membership and no-op grants/revokes are disabled.
  useEffect(() => {
    const raw = account.trim();
    if (!checkMembership || !hasKnownRoles || !isAddress(raw)) {
      setMembership(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      void checkMembership(getAddress(raw))
        .then((result) => {
          if (!cancelled) setMembership(result);
        })
        .catch(() => {
          if (!cancelled) setMembership(null);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [account, checkMembership, hasKnownRoles]);

  const selectedHeld =
    knownRole && membership ? (membership[knownRole.name] ?? undefined) : undefined;

  const resolveRole = (): `0x${string}` | undefined => {
    if (hasKnownRoles && !isCustom) {
      if (knownRole) return knownRole.value;
      setError('Select a role.');
      return undefined;
    }
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

      {hasKnownRoles ? (
        <label className="sd-field">
          <span className="sd-field__name">Role</span>
          <select
            className="sd-input"
            value={effectiveSelected}
            onChange={(e) => {
              setSelected(e.target.value);
              setError(null);
            }}
          >
            {knownRoles.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
            <option value={CUSTOM_ROLE}>Custom…</option>
          </select>
          {knownRole ? <code className="sd-roles__value">{knownRole.value}</code> : null}
        </label>
      ) : null}

      {isCustom ? (
        <>
          <label className="sd-field">
            <span className="sd-field__name">{hasKnownRoles ? 'Custom role' : 'Role'}</span>
            <input
              className="sd-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={hashName ? 'MINTER_ROLE' : `${DEFAULT_ADMIN_ROLE.slice(0, 10)}…`}
            />
          </label>
          <label className="sd-bool sd-roles__hash">
            <input
              type="checkbox"
              checked={hashName}
              onChange={(e) => setHashName(e.target.checked)}
            />
            <span>Hash name with keccak256 (OpenZeppelin style)</span>
          </label>
          {!hasKnownRoles ? (
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
          ) : null}
        </>
      ) : null}

      <label className="sd-field">
        <span className="sd-field__name">Account</span>
        <input
          className="sd-input"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="0x…"
        />
      </label>

      {membership && hasKnownRoles ? (
        <div className="sd-roles__membership" aria-label="Roles held by this account">
          {knownRoles.map((r) => {
            const held = membership[r.name] ?? false;
            return (
              <span
                key={r.name}
                className={`sd-badge sd-roles__member sd-roles__member--${held ? 'yes' : 'no'}`}
              >
                {held ? '✓' : '·'} {r.name}
              </span>
            );
          })}
        </div>
      ) : null}

      {error ? <p className="sd-field__error">{error}</p> : null}

      <div className="sd-roles__actions">
        {canGrant ? (
          <button
            className="sd-btn sd-btn--write"
            disabled={busy || selectedHeld === true}
            title={selectedHeld === true ? 'Account already has this role' : undefined}
            onClick={() => run(onGrant)}
          >
            Grant
          </button>
        ) : null}
        {canRevoke ? (
          <button
            className="sd-btn sd-btn--emergency"
            disabled={busy || selectedHeld === false}
            title={selectedHeld === false ? 'Account does not have this role' : undefined}
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
