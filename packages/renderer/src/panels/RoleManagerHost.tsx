import type { ContractFunction, ContractModel } from '@semantic-dapp/spec';
import { RoleManager, TxStatusView } from '@semantic-dapp/components';
import type { ContractRuntime } from '../runtime.js';
import { useConfirm } from '../useConfirm.js';

export interface RoleManagerHostProps {
  model: ContractModel;
  runtime: ContractRuntime;
}

function findFn(model: ContractModel, signature: string): ContractFunction | undefined {
  return model.functions.find((f) => f.signature === signature);
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
  const { confirm, dialog } = useConfirm();

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
