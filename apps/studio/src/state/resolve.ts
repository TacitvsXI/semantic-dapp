import { createPublicClientFor } from '@semantic-dapp/execution';
import { resolveContract, type ChainReader, type ResolveResult } from '@semantic-dapp/resolver';
import type { Address } from 'viem';

export interface ResolveByAddressArgs {
  address: Address;
  chainId: number;
  rpcUrl: string;
  apiKey?: string;
}

/**
 * Resolve a contract's ABI/source from its address. Uses the project's RPC for
 * proxy detection + code hash, and Sourcify/block-explorer adapters for the ABI.
 */
export async function resolveByAddress(args: ResolveByAddressArgs): Promise<ResolveResult> {
  const client = createPublicClientFor({ chainId: args.chainId, rpcUrl: args.rpcUrl });

  const reader: ChainReader = {
    getStorageAt: (a) => client.getStorageAt(a),
    getCode: (a) => client.getCode(a),
    call: async (a) => (await client.call({ to: a.to, data: a.data })).data,
  };

  return resolveContract({
    address: args.address,
    chainId: args.chainId,
    reader,
    ...(args.apiKey ? { apiKey: args.apiKey } : {}),
  });
}
