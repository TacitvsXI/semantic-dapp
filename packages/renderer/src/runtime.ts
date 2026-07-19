import type { ContractFunction } from '@semantic-dapp/spec';
import type { FormattedOutput, TxState } from '@semantic-dapp/execution';

export interface WalletState {
  isConnected: boolean;
  address?: string;
  chainId?: number;
  connect: () => void;
  disconnect: () => void;
}

/**
 * The bridge between the generated UI and the chain. Implemented by the host
 * app (studio / exported app) using wagmi + execution helpers. The renderer
 * itself never talks to a wallet or RPC directly.
 */
export interface ContractRuntime {
  wallet: WalletState;
  /** Execute a read (view/pure) call. */
  callRead: (func: ContractFunction, args: unknown[]) => Promise<FormattedOutput[]>;
  /** Simulate + submit a write; the runtime tracks the tx lifecycle. */
  submitWrite: (func: ContractFunction, args: unknown[], value?: bigint) => Promise<void>;
  /** Current transaction state for a function signature. */
  getTxState: (signature: string) => TxState;
  /** Optional block explorer base URL. */
  explorerUrl?: string;
}
