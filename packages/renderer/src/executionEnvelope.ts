import { encodeFunctionData, keccak256, type AbiFunction, type AbiParameter, type Hex } from 'viem';
import type { ContractFunction, NormalizedParameter } from '@semantic-dapp/spec';

/** Optional integrity signals from the host (ABI / proxy / diamond). */
export interface ExecutionIntegrity {
  abiHash?: string;
  manifestHash?: string;
  implementation?: string;
  codeHash?: string;
  /** Sorted facet addresses for EIP-2535 diamonds. */
  facetSet?: string[];
}

/**
 * Bound state after a successful Preview. Submit is allowed only while a freshly
 * rebuilt envelope still matches (calldata + chain/account/target + integrity).
 * `simulationBlock` is recorded for audit but excluded from equality — blocks
 * advance continuously and must not invalidate a valid preview.
 */
export interface ExecutionEnvelope {
  chainId: number | null;
  account: string | null;
  to: string | null;
  value: string;
  calldata: string;
  calldataHash: string;
  signature: string;
  args: unknown[];
  abiHash: string | null;
  manifestHash: string | null;
  implementation: string | null;
  codeHash: string | null;
  facetSet: string[] | null;
  simulationBlock: string | null;
}

export function encodeWriteCalldata(func: ContractFunction, args: unknown[]): Hex {
  return encodeFunctionData({
    abi: [toAbiFunction(func)],
    functionName: func.name,
    args,
  });
}

export function buildExecutionEnvelope(input: {
  signature: string;
  args: unknown[];
  calldata: string;
  chainId?: number;
  account?: string;
  to?: string;
  value?: bigint;
  integrity?: ExecutionIntegrity;
  simulationBlock?: bigint | number | string;
}): ExecutionEnvelope {
  const calldata = input.calldata.toLowerCase() as Hex;
  return {
    chainId: input.chainId ?? null,
    account: input.account?.toLowerCase() ?? null,
    to: input.to?.toLowerCase() ?? null,
    value: input.value !== undefined ? input.value.toString() : '0',
    calldata,
    calldataHash: keccak256(calldata),
    signature: input.signature,
    args: input.args.map(serializeArg),
    abiHash: input.integrity?.abiHash?.toLowerCase() ?? null,
    manifestHash: input.integrity?.manifestHash?.toLowerCase() ?? null,
    implementation: input.integrity?.implementation?.toLowerCase() ?? null,
    codeHash: input.integrity?.codeHash?.toLowerCase() ?? null,
    facetSet: normalizeFacetSet(input.integrity?.facetSet),
    simulationBlock:
      input.simulationBlock !== undefined && input.simulationBlock !== null
        ? String(input.simulationBlock)
        : null,
  };
}

/** Compare envelopes for submit gating (ignores simulationBlock). */
export function envelopesMatch(a: ExecutionEnvelope, b: ExecutionEnvelope): boolean {
  return (
    a.chainId === b.chainId &&
    a.account === b.account &&
    a.to === b.to &&
    a.value === b.value &&
    a.calldata === b.calldata &&
    a.calldataHash === b.calldataHash &&
    a.signature === b.signature &&
    JSON.stringify(a.args) === JSON.stringify(b.args) &&
    a.abiHash === b.abiHash &&
    a.manifestHash === b.manifestHash &&
    a.implementation === b.implementation &&
    a.codeHash === b.codeHash &&
    JSON.stringify(a.facetSet) === JSON.stringify(b.facetSet)
  );
}

/** Compact key for clearing bound previews when integrity / wallet / target drifts. */
export function executionContextKey(input: {
  chainId?: number;
  account?: string;
  target?: string;
  integrity?: ExecutionIntegrity;
}): string {
  return [
    input.chainId ?? '',
    input.account?.toLowerCase() ?? '',
    input.target?.toLowerCase() ?? '',
    input.integrity?.abiHash?.toLowerCase() ?? '',
    input.integrity?.manifestHash?.toLowerCase() ?? '',
    input.integrity?.implementation?.toLowerCase() ?? '',
    input.integrity?.codeHash?.toLowerCase() ?? '',
    JSON.stringify(normalizeFacetSet(input.integrity?.facetSet)),
  ].join('|');
}

function normalizeFacetSet(facets?: string[]): string[] | null {
  if (!facets || facets.length === 0) return null;
  return [...facets.map((f) => f.toLowerCase())].sort();
}

function serializeArg(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serializeArg);
  if (value === undefined) return null;
  return value;
}

function toAbiFunction(func: ContractFunction): AbiFunction {
  return {
    type: 'function',
    name: func.name,
    stateMutability: func.stateMutability,
    inputs: func.inputs.map(toAbiParameter),
    outputs: func.outputs.map(toAbiParameter),
  };
}

function toAbiParameter(param: NormalizedParameter): AbiParameter {
  if (param.components && param.components.length > 0) {
    return {
      name: param.name,
      type: param.type,
      components: param.components.map(toAbiParameter),
    } as AbiParameter;
  }
  return { name: param.name, type: param.type };
}
