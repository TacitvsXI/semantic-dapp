import type { Abi } from 'viem';
import type { SemanticManifest } from '@semantic-dapp/spec';

/** A locally-persisted studio project (no backend; self-hostable). */
export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Raw ABI as provided by the user. */
  abi: Abi;
  contract: {
    address?: string;
    chainId: number;
    name?: string;
  };
  rpcUrl: string;
  /** Computed semantic manifest (operations filled in by analyzer/classifier). */
  manifest?: SemanticManifest;
}

export const DEFAULT_RPC_URL =
  (import.meta.env.VITE_DEFAULT_RPC_URL as string | undefined) ?? 'http://127.0.0.1:8545';
export const DEFAULT_CHAIN_ID = Number(
  (import.meta.env.VITE_DEFAULT_CHAIN_ID as string | undefined) ?? '31337',
);
