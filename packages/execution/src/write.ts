import type { Abi, Address, PublicClient, WalletClient, Hash, TransactionReceipt } from 'viem';

export interface WriteRequest {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  account: Address;
  /** msg.value in wei, for payable functions. */
  value?: bigint;
}

/**
 * Simulate a write with `eth_call` before sending. Returns the prepared request
 * that can be handed to {@link executeWrite}. Throws on revert so the caller can
 * surface a decoded error (see `decodeExecutionError`).
 */
export async function simulateWrite(client: PublicClient, request: WriteRequest) {
  return client.simulateContract({
    address: request.address,
    abi: request.abi,
    functionName: request.functionName,
    args: request.args ?? [],
    account: request.account,
    ...(request.value !== undefined ? { value: request.value } : {}),
  });
}

/** Estimate gas for a write call. */
export async function estimateWriteGas(
  client: PublicClient,
  request: WriteRequest,
): Promise<bigint> {
  return client.estimateContractGas({
    address: request.address,
    abi: request.abi,
    functionName: request.functionName,
    args: request.args ?? [],
    account: request.account,
    ...(request.value !== undefined ? { value: request.value } : {}),
  });
}

/** Send a write transaction using the connected wallet client. */
export async function executeWrite(
  walletClient: WalletClient,
  // The `request` from a successful `simulateContract` call.
  request: Parameters<WalletClient['writeContract']>[0],
): Promise<Hash> {
  return walletClient.writeContract(request);
}

/** Wait for a transaction to be mined and return its receipt. */
export async function waitForTx(client: PublicClient, hash: Hash): Promise<TransactionReceipt> {
  return client.waitForTransactionReceipt({ hash });
}
