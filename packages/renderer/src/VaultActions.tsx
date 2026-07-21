import { useCallback, useEffect, useState } from 'react';
import type { ContractFunction, ContractModel } from '@semantic-dapp/spec';
import { VaultPanel, TxStatusView, type VaultAction } from '@semantic-dapp/components';
import type { ContractRuntime } from './runtime.js';

export interface VaultActionsProps {
  model: ContractModel;
  runtime: ContractRuntime;
}

interface VaultMeta {
  name?: string;
  shareSymbol?: string;
  decimals?: number;
  totalAssets?: bigint;
  totalSupply?: bigint;
  shareBalance?: bigint;
  maxWithdraw?: bigint;
}

function findFn(model: ContractModel, signature: string): ContractFunction | undefined {
  return model.functions.find((f) => f.signature === signature);
}

const PREVIEW_SIG: Record<VaultAction, string> = {
  deposit: 'previewDeposit(uint256)',
  mint: 'previewMint(uint256)',
  withdraw: 'previewWithdraw(uint256)',
  redeem: 'previewRedeem(uint256)',
};

const ACTION_SIG: Record<VaultAction, string> = {
  deposit: 'deposit(uint256,address)',
  mint: 'mint(uint256,address)',
  withdraw: 'withdraw(uint256,address,address)',
  redeem: 'redeem(uint256,address,address)',
};

/**
 * Wires the semantic ERC-4626 {@link VaultPanel} to the runtime: loads vault
 * state, resolves live previews through the `previewX` view functions, and
 * submits deposit/mint/withdraw/redeem with the connected account as receiver
 * (and owner). Assets and shares are assumed to share `decimals()`.
 */
export function VaultActions({ model, runtime }: VaultActionsProps) {
  const [meta, setMeta] = useState<VaultMeta>({});
  const [loading, setLoading] = useState(false);
  const address = runtime.wallet.address;

  const readScalar = useCallback(
    async (signature: string, args: unknown[] = []) => {
      const fn = findFn(model, signature);
      if (!fn) return undefined;
      try {
        const out = await runtime.callRead(fn, args);
        return out[0]?.value;
      } catch {
        return undefined;
      }
    },
    [model, runtime],
  );

  const loadMeta = useCallback(async () => {
    setLoading(true);
    const next: VaultMeta = {};
    const name = await readScalar('name()');
    const symbol = await readScalar('symbol()');
    const decimals = await readScalar('decimals()');
    const totalAssets = await readScalar('totalAssets()');
    const totalSupply = await readScalar('totalSupply()');
    if (typeof name === 'string') next.name = name;
    if (typeof symbol === 'string') next.shareSymbol = symbol;
    if (typeof decimals === 'string') next.decimals = Number(decimals);
    if (typeof totalAssets === 'string') next.totalAssets = BigInt(totalAssets);
    if (typeof totalSupply === 'string') next.totalSupply = BigInt(totalSupply);
    if (address) {
      const bal = await readScalar('balanceOf(address)', [address]);
      if (typeof bal === 'string') next.shareBalance = BigInt(bal);
      const maxW = await readScalar('maxWithdraw(address)', [address]);
      if (typeof maxW === 'string') next.maxWithdraw = BigInt(maxW);
    }
    setMeta(next);
    setLoading(false);
  }, [readScalar, address]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const preview = useCallback(
    async (action: VaultAction, amount: bigint): Promise<bigint | undefined> => {
      const fn = findFn(model, PREVIEW_SIG[action]);
      if (!fn) return undefined;
      try {
        const out = await runtime.callRead(fn, [amount]);
        const value = out[0]?.value;
        return typeof value === 'string' ? BigInt(value) : undefined;
      } catch {
        return undefined;
      }
    },
    [model, runtime],
  );

  const submit = useCallback(
    async (action: VaultAction, args: unknown[]) => {
      const fn = findFn(model, ACTION_SIG[action]);
      if (!fn) return;
      await runtime.submitWrite(fn, args);
      void loadMeta();
    },
    [model, runtime, loadMeta],
  );

  const decimals = meta.decimals ?? 18;
  const txFor = (action: VaultAction) => {
    const fn = findFn(model, ACTION_SIG[action]);
    return fn ? runtime.getTxState(fn.signature) : undefined;
  };
  const isBusy = (action: VaultAction) => {
    const tx = txFor(action);
    return tx?.phase === 'pending' || tx?.phase === 'awaiting-signature';
  };
  const receiver = (address ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;

  const activeTx = txFor('deposit') ?? txFor('mint') ?? txFor('withdraw') ?? txFor('redeem');

  return (
    <div className="sd-vault-actions">
      <VaultPanel
        {...(meta.name !== undefined ? { name: meta.name } : {})}
        {...(meta.shareSymbol !== undefined ? { shareSymbol: meta.shareSymbol } : {})}
        decimals={decimals}
        {...(meta.totalAssets !== undefined ? { totalAssets: meta.totalAssets } : {})}
        {...(meta.totalSupply !== undefined ? { totalSupply: meta.totalSupply } : {})}
        {...(meta.shareBalance !== undefined ? { shareBalance: meta.shareBalance } : {})}
        {...(meta.maxWithdraw !== undefined ? { maxWithdraw: meta.maxWithdraw } : {})}
        loading={loading}
        busy={{
          deposit: isBusy('deposit'),
          mint: isBusy('mint'),
          withdraw: isBusy('withdraw'),
          redeem: isBusy('redeem'),
        }}
        preview={preview}
        onDeposit={(assets) => void submit('deposit', [assets, receiver])}
        onMint={(shares) => void submit('mint', [shares, receiver])}
        onWithdraw={(assets) => void submit('withdraw', [assets, receiver, receiver])}
        onRedeem={(shares) => void submit('redeem', [shares, receiver, receiver])}
      />
      {activeTx ? <TxStatusView state={activeTx} explorerUrl={runtime.explorerUrl} /> : null}
    </div>
  );
}
