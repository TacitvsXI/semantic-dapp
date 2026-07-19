import type { Abi, PublicClient, Address } from 'viem';
import { formatReadResult, type FormattedOutput } from './format.js';
import type { NormalizedParameter } from '@semantic-dapp/spec';

export interface ReadRequest {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}

/** Perform a read (view/pure) call and return the raw decoded value. */
export async function readContractFunction(
  client: PublicClient,
  request: ReadRequest,
): Promise<unknown> {
  return client.readContract({
    address: request.address,
    abi: request.abi,
    functionName: request.functionName,
    args: request.args ?? [],
  });
}

/** Read a function and format the result against its declared outputs. */
export async function readAndFormat(
  client: PublicClient,
  request: ReadRequest,
  outputs: NormalizedParameter[],
): Promise<FormattedOutput[]> {
  const raw = await readContractFunction(client, request);
  return formatReadResult(outputs, raw);
}
