import { buildManifest } from '@semantic-dapp/classifier';
import { buildBundle, type SemanticBundle } from '@semantic-dapp/export';
import { createPublicClientFor, explorerUrlForChain } from '@semantic-dapp/execution';
import { resolveContract, type ChainReader } from '@semantic-dapp/resolver';
import { normalizeAbi, parseAbiJson, type Abi } from '@semantic-dapp/spec';
import { getAddress, isAddress, type Address } from 'viem';

const CONTRACT_ID = 'contract';

/** Public RPCs good enough for a browser demo (no API key). */
const DEFAULT_RPC: Record<number, string> = {
  1: 'https://ethereum-rpc.publicnode.com',
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  8453: 'https://base-rpc.publicnode.com',
  42161: 'https://arbitrum-one-rpc.publicnode.com',
  10: 'https://optimism-rpc.publicnode.com',
  137: 'https://polygon-bor-rpc.publicnode.com',
};

export function defaultRpcForChain(chainId: number): string {
  return DEFAULT_RPC[chainId] ?? DEFAULT_RPC[1]!;
}

export interface LoadFromAbiInput {
  abiText: string;
  chainId: number;
  rpcUrl?: string;
  address?: string;
  name?: string;
}

export interface LoadFromAddressInput {
  address: string;
  chainId: number;
  rpcUrl?: string;
  apiKey?: string;
  name?: string;
}

function toBundle(args: {
  abi: Abi;
  chainId: number;
  rpcUrl: string;
  address?: Address;
  name: string;
  contractName?: string;
}): SemanticBundle {
  const model = normalizeAbi(args.abi);
  const manifest = buildManifest(model, {
    projectName: args.name,
    contractId: CONTRACT_ID,
    chainId: args.chainId,
    ...(args.address ? { address: args.address } : {}),
    ...(args.contractName ? { contractName: args.contractName } : {}),
    abiSource: 'manual',
  });
  const explorer = explorerUrlForChain(args.chainId);
  return buildBundle({
    name: args.name,
    chainId: args.chainId,
    abi: args.abi,
    manifest,
    rpcUrl: args.rpcUrl,
    ...(args.address ? { address: args.address } : {}),
    ...(args.contractName ? { contractName: args.contractName } : {}),
    ...(explorer ? { explorerUrl: explorer } : {}),
    generator: { name: 'semantic-dapp-demo', version: '0.1.1' },
  });
}

/** Build a live bundle from a pasted ABI / Foundry artifact JSON. */
export function loadFromAbi(
  input: LoadFromAbiInput,
): { ok: true; bundle: SemanticBundle } | { ok: false; error: string } {
  const parsed = parseAbiJson(input.abiText.trim());
  if (!parsed.success || !parsed.abi) {
    return { ok: false, error: parsed.error ?? 'Invalid ABI JSON' };
  }
  if (parsed.abi.length === 0) {
    return { ok: false, error: 'ABI is empty.' };
  }

  let address: Address | undefined;
  if (input.address?.trim()) {
    if (!isAddress(input.address.trim())) {
      return { ok: false, error: 'Address is not a valid 0x… checksum/hex address.' };
    }
    address = getAddress(input.address.trim());
  }

  const chainId = Number(input.chainId);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    return { ok: false, error: 'Chain id must be a positive integer.' };
  }

  const rpcUrl = (input.rpcUrl?.trim() || defaultRpcForChain(chainId)).trim();
  const name = input.name?.trim() || 'Your contract';

  try {
    return {
      ok: true,
      bundle: toBundle({
        abi: parsed.abi,
        chainId,
        rpcUrl,
        name,
        ...(address ? { address } : {}),
        contractName: name,
      }),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Resolve ABI from an on-chain address (Sourcify / explorer), then build a bundle. */
export async function loadFromAddress(
  input: LoadFromAddressInput,
): Promise<{ ok: true; bundle: SemanticBundle } | { ok: false; error: string }> {
  if (!isAddress(input.address.trim())) {
    return { ok: false, error: 'Enter a valid contract address.' };
  }
  const address = getAddress(input.address.trim());
  const chainId = Number(input.chainId);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    return { ok: false, error: 'Chain id must be a positive integer.' };
  }
  const rpcUrl = (input.rpcUrl?.trim() || defaultRpcForChain(chainId)).trim();

  try {
    const client = createPublicClientFor({ chainId, rpcUrl });
    const reader: ChainReader = {
      getStorageAt: (a) => client.getStorageAt(a),
      getCode: (a) => client.getCode(a),
      call: async (a) => (await client.call({ to: a.to, data: a.data })).data,
    };
    const resolved = await resolveContract({
      address,
      chainId,
      reader,
      ...(input.apiKey?.trim() ? { apiKey: input.apiKey.trim() } : {}),
    });
    if (!resolved.ok) {
      return {
        ok: false,
        error:
          `${resolved.reason}. Tried: ${resolved.triedSources.join(', ') || 'none'}. ` +
          'Paste the ABI instead, or add an explorer API key.',
      };
    }
    const c = resolved.contract;
    const name = input.name?.trim() || c.contractName || 'Your contract';
    return {
      ok: true,
      bundle: toBundle({
        abi: c.abi,
        chainId,
        rpcUrl,
        address: c.address,
        name,
        contractName: c.contractName ?? name,
      }),
    };
  } catch (e) {
    return { ok: false, error: `Resolve failed: ${(e as Error).message}` };
  }
}
