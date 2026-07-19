import { normalizeAbi, type Abi } from '@semantic-dapp/spec';
import { buildManifest } from '@semantic-dapp/classifier';
import { buildBundle, type SemanticBundle } from '@semantic-dapp/export';

const CONTRACT_ID = 'contract';

/**
 * Extract an ABI from parsed JSON. Accepts either a bare ABI array or a
 * Foundry/Hardhat artifact object with an `abi` field.
 */
export function abiFromJson(value: unknown): Abi {
  const raw = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { abi?: unknown }).abi)
      ? (value as { abi: unknown[] }).abi
      : undefined;
  if (!raw) {
    throw new Error('Input is not an ABI array or an artifact with an `abi` field.');
  }
  return raw as Abi;
}

export interface BundleInputs {
  abi: Abi;
  name: string;
  chainId: number;
  address?: string;
  rpcUrl?: string;
  contractName?: string;
  explorerUrl?: string;
  generatedAt?: string;
}

/**
 * Analyze + classify an ABI and package it into a {@link SemanticBundle}. Pure:
 * no filesystem or network access, so it is easy to test.
 */
export function bundleFromInputs(inputs: BundleInputs): SemanticBundle {
  const model = normalizeAbi(inputs.abi);
  const manifest = buildManifest(model, {
    projectName: inputs.name,
    contractId: CONTRACT_ID,
    chainId: inputs.chainId,
    abiSource: 'manual',
    ...(inputs.address ? { address: inputs.address } : {}),
    ...(inputs.contractName ? { contractName: inputs.contractName } : {}),
  });

  return buildBundle({
    name: inputs.name,
    chainId: inputs.chainId,
    // `Abi` (abitype) is readonly; the bundle schema validates a mutable copy.
    abi: inputs.abi as unknown as SemanticBundle['abi'],
    manifest,
    ...(inputs.rpcUrl ? { rpcUrl: inputs.rpcUrl } : {}),
    ...(inputs.address ? { address: inputs.address } : {}),
    ...(inputs.contractName ? { contractName: inputs.contractName } : {}),
    ...(inputs.explorerUrl ? { explorerUrl: inputs.explorerUrl } : {}),
    ...(inputs.generatedAt ? { generatedAt: inputs.generatedAt } : {}),
  });
}
