import {
  encodeFunctionData,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
  type Hash,
  type TransactionReceipt,
} from 'viem';
import { decodeExecutionError, type DecodedExecutionError } from './errors.js';

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

/** The result of dry-running a write before asking the user to sign. */
export interface WritePreview {
  /** Target contract address. */
  to: Address;
  functionName: string;
  /** ABI-encoded calldata that will be sent (verifiable by the user). */
  calldata: Hex;
  /** msg.value in wei, when payable. */
  value?: bigint;
  /** Estimated gas, when the dry-run succeeds and estimation is available. */
  gasEstimate?: bigint;
  /** Whether the simulated call would succeed (no revert). */
  success: boolean;
  /** Decoded revert/error when the dry-run fails. */
  error?: DecodedExecutionError;
}

/**
 * Dry-run a write **without sending it**: encode the exact calldata and simulate
 * the call via `eth_call` so the user can verify what will be sent and whether it
 * would revert, before signing. Never throws - failures are returned as a decoded
 * error on `success: false` (the whole point is to surface reverts safely).
 */
export async function previewWrite(
  client: PublicClient,
  request: WriteRequest,
): Promise<WritePreview> {
  const calldata = encodeFunctionData({
    abi: request.abi,
    functionName: request.functionName,
    args: request.args ?? [],
  });
  const base: WritePreview = {
    to: request.address,
    functionName: request.functionName,
    calldata,
    ...(request.value !== undefined ? { value: request.value } : {}),
    success: false,
  };

  try {
    await simulateWrite(client, request);
    let gasEstimate: bigint | undefined;
    try {
      gasEstimate = await estimateWriteGas(client, request);
    } catch {
      gasEstimate = undefined;
    }
    return { ...base, success: true, ...(gasEstimate !== undefined ? { gasEstimate } : {}) };
  } catch (error) {
    return { ...base, success: false, error: decodeExecutionError(error) };
  }
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
