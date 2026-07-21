import { useEffect, useState } from 'react';
import type { ContractModel } from '@semantic-dapp/spec';
import type { AmountContext } from '@semantic-dapp/components';
import type { ContractRuntime } from './runtime.js';

/**
 * Reads the contract's `decimals`/`symbol` (and the connected account's
 * `balanceOf`) once so generic `token-amount` inputs can render in human units.
 * A no-op unless `enabled` (i.e. the contract is a fungible token / vault).
 */
export function useAmountMeta(
  model: ContractModel,
  runtime: ContractRuntime,
  enabled: boolean,
): AmountContext {
  const [meta, setMeta] = useState<AmountContext>({});
  const address = runtime.wallet.address;

  useEffect(() => {
    if (!enabled) {
      setMeta({});
      return;
    }
    let cancelled = false;
    const read = async (signature: string, args: unknown[] = []) => {
      const fn = model.functions.find((f) => f.signature === signature);
      if (!fn) return undefined;
      try {
        const out = await runtime.callRead(fn, args);
        return out[0]?.value;
      } catch {
        return undefined;
      }
    };
    void (async () => {
      const next: AmountContext = {};
      const decimals = await read('decimals()');
      const symbol = await read('symbol()');
      if (typeof decimals === 'string') next.decimals = Number(decimals);
      if (typeof symbol === 'string') next.symbol = symbol;
      if (address) {
        const balance = await read('balanceOf(address)', [address]);
        if (typeof balance === 'string') next.balance = BigInt(balance);
      }
      if (!cancelled) setMeta(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [model, runtime, enabled, address]);

  return meta;
}
