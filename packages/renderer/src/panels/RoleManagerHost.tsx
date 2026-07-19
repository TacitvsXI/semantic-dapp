import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContractFunction, ContractModel } from '@semantic-dapp/spec';
import { RoleManager, TxStatusView, type RoleOption } from '@semantic-dapp/components';
import type { ContractRuntime } from '../runtime.js';
import { useConfirm } from '../useConfirm.js';

export interface RoleManagerHostProps {
  model: ContractModel;
  runtime: ContractRuntime;
}

function findFn(model: ContractModel, signature: string): ContractFunction | undefined {
  return model.functions.find((f) => f.signature === signature);
}

/**
 * Role constant getters: no-arg view functions returning a single bytes32 whose
 * name mentions "role" (e.g. MINTER_ROLE, DEFAULT_ADMIN_ROLE). Their on-chain
 * values populate the role dropdown so users pick a role by name, not by hash.
 */
function roleGetters(model: ContractModel): ContractFunction[] {
  return model.functions.filter(
    (f) =>
      f.isRead &&
      f.inputs.length === 0 &&
      f.outputs.length === 1 &&
      f.outputs[0]!.type === 'bytes32' &&
      /role/i.test(f.name),
  );
}

function isBytes32(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function isBusy(runtime: ContractRuntime, fn?: ContractFunction): boolean {
  if (!fn) return false;
  const phase = runtime.getTxState(fn.signature).phase;
  return phase === 'pending' || phase === 'awaiting-signature' || phase === 'simulating';
}

/** AccessControl role console wired to the runtime, with confirmation on writes. */
export function RoleManagerHost({ model, runtime }: RoleManagerHostProps) {
  const grantFn = findFn(model, 'grantRole(bytes32,address)');
  const revokeFn = findFn(model, 'revokeRole(bytes32,address)');
  const renounceFn = findFn(model, 'renounceRole(bytes32,address)');
  const hasRoleFn = findFn(model, 'hasRole(bytes32,address)');
  const { confirm, dialog } = useConfirm();

  // Discover the contract's role constants and read their bytes32 values so the
  // user can pick a role by name. Reads need a target address + RPC; if they
  // fail (e.g. offline), the manager falls back to manual role entry.
  const getters = useMemo(() => roleGetters(model), [model]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const { callRead } = runtime;
  useEffect(() => {
    if (getters.length === 0) {
      setRoles([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const found: RoleOption[] = [];
      for (const fn of getters) {
        try {
          const result = await callRead(fn, []);
          const value = result[0]?.value;
          if (isBytes32(value)) found.push({ name: fn.name, value });
        } catch {
          /* getter unreadable (no address/RPC) — skip; manual entry remains */
        }
      }
      if (!cancelled) setRoles(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [getters, callRead]);

  // Resolve which discovered roles an account currently holds via `hasRole`.
  const checkMembership = useCallback(
    async (account: `0x${string}`): Promise<Record<string, boolean>> => {
      const out: Record<string, boolean> = {};
      if (!hasRoleFn) return out;
      for (const r of roles) {
        try {
          const result = await callRead(hasRoleFn, [r.value, account]);
          out[r.name] = result[0]?.value === 'true';
        } catch {
          /* unreadable — leave this role out of the result */
        }
      }
      return out;
    },
    [hasRoleFn, roles, callRead],
  );

  const run = async (
    fn: ContractFunction | undefined,
    title: string,
    risk: 'high' | 'medium',
    role: `0x${string}`,
    account: `0x${string}`,
  ) => {
    if (!fn) return;
    const ok = await confirm({
      title,
      risk,
      permission: { kind: 'access-control', role },
      signature: fn.signature,
      summary: [
        { label: 'role', value: role },
        { label: 'account', value: account },
      ],
    });
    if (!ok) return;
    await runtime.submitWrite(fn, [role, account]);
  };

  const busy = isBusy(runtime, grantFn) || isBusy(runtime, revokeFn) || isBusy(runtime, renounceFn);

  return (
    <>
      {dialog}
      <RoleManager
        canGrant={Boolean(grantFn)}
        canRevoke={Boolean(revokeFn)}
        canRenounce={Boolean(renounceFn)}
        connectedAddress={runtime.wallet.address}
        busy={busy}
        roles={roles}
        {...(hasRoleFn && roles.length > 0 ? { checkMembership } : {})}
        onGrant={(role, account) => void run(grantFn, 'Grant role', 'high', role, account)}
        onRevoke={(role, account) => void run(revokeFn, 'Revoke role', 'high', role, account)}
        onRenounce={(role, account) =>
          void run(renounceFn, 'Renounce role', 'medium', role, account)
        }
      />
      {[grantFn, revokeFn, renounceFn].map((fn) =>
        fn ? (
          <TxStatusView
            key={fn.signature}
            state={runtime.getTxState(fn.signature)}
            explorerUrl={runtime.explorerUrl}
          />
        ) : null,
      )}
    </>
  );
}
