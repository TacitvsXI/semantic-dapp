import { useCallback, useEffect, useState } from 'react';
import type { ContractFunction, ContractModel } from '@semantic-dapp/spec';
import {
  TokenApproval,
  TokenDashboard,
  TokenTransfer,
  TxStatusView,
} from '@semantic-dapp/components';
import type { ContractRuntime } from './runtime.js';

export interface TokenActionsProps {
  model: ContractModel;
  runtime: ContractRuntime;
}

interface TokenMeta {
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: bigint;
  balance?: bigint;
}

function findFn(model: ContractModel, signature: string): ContractFunction | undefined {
  return model.functions.find((f) => f.signature === signature);
}

/**
 * Semantic ERC-20 panel shown at the top of the User tab: live metadata plus
 * trusted Transfer/Approve components wired to the runtime.
 */
export function TokenActions({ model, runtime }: TokenActionsProps) {
  const transferFn = findFn(model, 'transfer(address,uint256)');
  const approveFn = findFn(model, 'approve(address,uint256)');
  const [meta, setMeta] = useState<TokenMeta>({});
  const [loading, setLoading] = useState(false);

  const address = runtime.wallet.address;

  const loadMeta = useCallback(async () => {
    setLoading(true);
    const next: TokenMeta = {};
    const readScalar = async (signature: string, args: unknown[] = []) => {
      const fn = findFn(model, signature);
      if (!fn) return undefined;
      try {
        const out = await runtime.callRead(fn, args);
        return out[0]?.value;
      } catch {
        return undefined;
      }
    };
    const name = await readScalar('name()');
    const symbol = await readScalar('symbol()');
    const decimals = await readScalar('decimals()');
    const totalSupply = await readScalar('totalSupply()');
    if (typeof name === 'string') next.name = name;
    if (typeof symbol === 'string') next.symbol = symbol;
    if (typeof decimals === 'string') next.decimals = Number(decimals);
    if (typeof totalSupply === 'string') next.totalSupply = BigInt(totalSupply);
    if (address) {
      const balance = await readScalar('balanceOf(address)', [address]);
      if (typeof balance === 'string') next.balance = BigInt(balance);
    }
    setMeta(next);
    setLoading(false);
  }, [model, runtime, address]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const decimals = meta.decimals ?? 18;
  const transferTx = transferFn ? runtime.getTxState(transferFn.signature) : undefined;
  const approveTx = approveFn ? runtime.getTxState(approveFn.signature) : undefined;

  return (
    <div className="sd-token-actions">
      <TokenDashboard
        name={meta.name}
        symbol={meta.symbol}
        decimals={meta.decimals}
        totalSupply={meta.totalSupply}
        connectedBalance={meta.balance}
        loading={loading}
      />

      {transferFn ? (
        <section className="sd-card">
          <h3 className="sd-card__title">Transfer</h3>
          <TokenTransfer
            decimals={decimals}
            symbol={meta.symbol}
            balance={meta.balance}
            busy={transferTx?.phase === 'pending' || transferTx?.phase === 'awaiting-signature'}
            onTransfer={async (to, amount) => {
              await runtime.submitWrite(transferFn, [to, amount]);
              void loadMeta();
            }}
          />
          {transferTx ? (
            <TxStatusView state={transferTx} explorerUrl={runtime.explorerUrl} />
          ) : null}
        </section>
      ) : null}

      {approveFn ? (
        <section className="sd-card">
          <h3 className="sd-card__title">Approve</h3>
          <TokenApproval
            decimals={decimals}
            symbol={meta.symbol}
            busy={approveTx?.phase === 'pending' || approveTx?.phase === 'awaiting-signature'}
            onApprove={(spender, amount) => runtime.submitWrite(approveFn, [spender, amount])}
          />
          {approveTx ? <TxStatusView state={approveTx} explorerUrl={runtime.explorerUrl} /> : null}
        </section>
      ) : null}
    </div>
  );
}
