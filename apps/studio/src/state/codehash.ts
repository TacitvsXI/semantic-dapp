import { keccak256, type Address } from 'viem';
import { createPublicClientFor } from '@semantic-dapp/execution';

export interface CodeHashArgs {
  chainId: number;
  rpcUrl: string;
  address: string;
}

/** Fetch keccak256 of the bytecode at an address, or undefined if no code. */
export async function fetchCodeHash(args: CodeHashArgs): Promise<string | undefined> {
  const client = createPublicClientFor({ chainId: args.chainId, rpcUrl: args.rpcUrl });
  const code = await client.getCode({ address: args.address as Address });
  if (!code || code === '0x') return undefined;
  return keccak256(code);
}
