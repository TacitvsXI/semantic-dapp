import type { Address, PublicClient } from 'viem';

/** Minimal ERC-20 ABI for metadata reads. */
export const erc20MetadataAbi = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export interface Erc20Metadata {
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: bigint;
}

async function tryRead<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

/**
 * Read live ERC-20 metadata from a deployed contract. Each field is read
 * independently so a missing optional method (e.g. `name`) does not fail the
 * whole read.
 */
export async function readErc20Metadata(
  client: PublicClient,
  address: Address,
): Promise<Erc20Metadata> {
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    tryRead(() => client.readContract({ address, abi: erc20MetadataAbi, functionName: 'name' })),
    tryRead(() => client.readContract({ address, abi: erc20MetadataAbi, functionName: 'symbol' })),
    tryRead(() =>
      client.readContract({ address, abi: erc20MetadataAbi, functionName: 'decimals' }),
    ),
    tryRead(() =>
      client.readContract({ address, abi: erc20MetadataAbi, functionName: 'totalSupply' }),
    ),
  ]);

  const metadata: Erc20Metadata = {};
  if (typeof name === 'string') metadata.name = name;
  if (typeof symbol === 'string') metadata.symbol = symbol;
  if (typeof decimals === 'number') metadata.decimals = decimals;
  if (typeof totalSupply === 'bigint') metadata.totalSupply = totalSupply;
  return metadata;
}
