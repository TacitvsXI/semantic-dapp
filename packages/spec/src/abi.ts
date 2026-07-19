import type { Abi, AbiFunction, AbiEvent, AbiError, AbiParameter } from 'abitype';
import { toFunctionSelector, toFunctionSignature, toEventSelector, toEventSignature } from 'viem';

export type StateMutability = 'pure' | 'view' | 'nonpayable' | 'payable';

export interface NormalizedParameter {
  name: string;
  type: string;
  internalType?: string;
  components?: NormalizedParameter[];
}

export interface ContractFunction {
  kind: 'function';
  name: string;
  /** Canonical signature, e.g. `transfer(address,uint256)`. */
  signature: string;
  /** 4-byte selector, e.g. `0xa9059cbb`. */
  selector: `0x${string}`;
  stateMutability: StateMutability;
  inputs: NormalizedParameter[];
  outputs: NormalizedParameter[];
  /** `true` for `pure` / `view` functions. */
  isRead: boolean;
  /** `true` for `payable` functions. */
  isPayable: boolean;
}

export interface ContractEvent {
  kind: 'event';
  name: string;
  signature: string;
  /** 32-byte topic hash. */
  topic: `0x${string}`;
  inputs: NormalizedParameter[];
  anonymous: boolean;
}

export interface ContractError {
  kind: 'error';
  name: string;
  signature: string;
  selector: `0x${string}`;
  inputs: NormalizedParameter[];
}

export interface ContractConstructor {
  stateMutability: 'nonpayable' | 'payable';
  inputs: NormalizedParameter[];
}

/**
 * Deterministic, RPC-free normalization of an ABI into a stable model that the
 * analyzer, classifier, renderer and execution layers can share.
 */
export interface ContractModel {
  functions: ContractFunction[];
  events: ContractEvent[];
  errors: ContractError[];
  deployConstructor?: ContractConstructor;
  hasFallback: boolean;
  hasReceive: boolean;
  /** Sorted list of function selectors, useful for standard detection. */
  selectors: `0x${string}`[];
  /** The original ABI, kept for lossless round-tripping. */
  abi: Abi;
}

function normalizeParameters(params: readonly AbiParameter[] | undefined): NormalizedParameter[] {
  if (!params) return [];
  return params.map((p, index) => {
    const normalized: NormalizedParameter = {
      name: p.name && p.name.length > 0 ? p.name : `arg${index}`,
      type: p.type,
    };
    if (p.internalType) normalized.internalType = p.internalType;
    const components = (p as { components?: readonly AbiParameter[] }).components;
    if (components) normalized.components = normalizeParameters(components);
    return normalized;
  });
}

function normalizeFunction(item: AbiFunction): ContractFunction {
  const stateMutability = (item.stateMutability ?? 'nonpayable') as StateMutability;
  return {
    kind: 'function',
    name: item.name,
    signature: toFunctionSignature(item),
    selector: toFunctionSelector(item),
    stateMutability,
    inputs: normalizeParameters(item.inputs),
    outputs: normalizeParameters(item.outputs),
    isRead: stateMutability === 'pure' || stateMutability === 'view',
    isPayable: stateMutability === 'payable',
  };
}

function normalizeEvent(item: AbiEvent): ContractEvent {
  return {
    kind: 'event',
    name: item.name,
    signature: toEventSignature(item),
    topic: toEventSelector(item),
    inputs: normalizeParameters(item.inputs),
    anonymous: item.anonymous ?? false,
  };
}

function normalizeError(item: AbiError): ContractError {
  const signature = toFunctionSignature(item as unknown as AbiFunction);
  return {
    kind: 'error',
    name: item.name,
    signature,
    selector: toFunctionSelector(item as unknown as AbiFunction),
    inputs: normalizeParameters(item.inputs),
  };
}

/**
 * Normalize a raw ABI into a {@link ContractModel}. Pure and deterministic:
 * no network access, no wallet, no side effects.
 */
export function normalizeAbi(abi: Abi): ContractModel {
  const functions: ContractFunction[] = [];
  const events: ContractEvent[] = [];
  const errors: ContractError[] = [];
  let deployConstructor: ContractConstructor | undefined;
  let hasFallback = false;
  let hasReceive = false;

  for (const item of abi) {
    switch (item.type) {
      case 'function':
        functions.push(normalizeFunction(item));
        break;
      case 'event':
        events.push(normalizeEvent(item));
        break;
      case 'error':
        errors.push(normalizeError(item));
        break;
      case 'constructor':
        deployConstructor = {
          stateMutability: (item.stateMutability === 'payable' ? 'payable' : 'nonpayable') as
            'nonpayable' | 'payable',
          inputs: normalizeParameters(item.inputs),
        };
        break;
      case 'fallback':
        hasFallback = true;
        break;
      case 'receive':
        hasReceive = true;
        break;
      default:
        break;
    }
  }

  functions.sort((a, b) => a.name.localeCompare(b.name) || a.signature.localeCompare(b.signature));
  events.sort((a, b) => a.name.localeCompare(b.name));
  errors.sort((a, b) => a.name.localeCompare(b.name));

  const selectors = [...functions.map((f) => f.selector)].sort();

  const model: ContractModel = {
    functions,
    events,
    errors,
    hasFallback,
    hasReceive,
    selectors,
    abi,
  };
  if (deployConstructor) model.deployConstructor = deployConstructor;
  return model;
}

/** Set of function selectors present in the model, for fast standard checks. */
export function selectorSet(model: ContractModel): Set<`0x${string}`> {
  return new Set(model.selectors);
}
