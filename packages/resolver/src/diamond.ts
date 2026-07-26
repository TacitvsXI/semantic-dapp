import {
  decodeAbiParameters,
  getAddress,
  toFunctionSelector,
  type Abi,
  type AbiFunction,
  type Address,
  type Hex,
} from 'viem';
import type { ChainReader } from './types.js';

/** `facetAddresses()` — IERC2535DiamondLoupe. */
export const FACET_ADDRESSES_SELECTOR: Hex = '0x52ef6b2c';
/** `facets()` — IERC2535DiamondLoupe (address + selectors per facet). */
export const FACETS_SELECTOR: Hex = '0x7a0ed627';
/** `diamondCut((address,uint8,bytes4[])[],address,bytes)` — IERC2535DiamondCut. */
export const DIAMOND_CUT_SELECTOR: Hex = '0x1f931c1c';

/**
 * Enumerate facet addresses via the EIP-2535 loupe (`facetAddresses()`).
 * Returns undefined if the call reverts, returns empty, or no facet has code
 * (guards against accidental false positives).
 */
export async function enumerateDiamondFacets(
  reader: ChainReader,
  address: Address,
): Promise<Address[] | undefined> {
  let raw: Hex | undefined;
  try {
    raw = await reader.call({ to: address, data: FACET_ADDRESSES_SELECTOR });
  } catch {
    return undefined;
  }
  if (!raw || raw === '0x' || raw.length < 130) return undefined;

  let decoded: readonly Address[];
  try {
    const [addrs] = decodeAbiParameters([{ type: 'address[]' }], raw);
    decoded = addrs;
  } catch {
    return undefined;
  }

  const unique = new Map<string, Address>();
  for (const a of decoded) {
    try {
      const checksummed = getAddress(a);
      if (checksummed === '0x0000000000000000000000000000000000000000') continue;
      unique.set(checksummed.toLowerCase(), checksummed);
    } catch {
      /* skip malformed */
    }
  }
  if (unique.size === 0) return undefined;

  const withCode: Address[] = [];
  for (const facet of unique.values()) {
    try {
      const code = await reader.getCode({ address: facet });
      if (code && code !== '0x') withCode.push(facet);
    } catch {
      /* skip */
    }
  }
  return withCode.length > 0 ? withCode : undefined;
}

/**
 * Merge ABIs from a diamond shell + its facets into one call surface.
 * Functions are deduped by 4-byte selector (first wins); events/errors by
 * name+types key. Constructor/fallback/receive from later ABIs are skipped
 * once one is kept (diamonds typically have a single fallback).
 */
export function mergeAbis(abis: Abi[]): Abi {
  const functions = new Map<string, Abi[number]>();
  const events = new Map<string, Abi[number]>();
  const errors = new Map<string, Abi[number]>();
  const other: Abi[number][] = [];
  let hasFallback = false;
  let hasReceive = false;
  let hasConstructor = false;

  for (const abi of abis) {
    for (const item of abi) {
      if (item.type === 'function') {
        try {
          const sel = toFunctionSelector(item as AbiFunction);
          if (!functions.has(sel)) functions.set(sel, item);
        } catch {
          // Malformed ABI item — skip rather than break the merge.
        }
      } else if (item.type === 'event') {
        const key = eventKey(item);
        if (!events.has(key)) events.set(key, item);
      } else if (item.type === 'error') {
        const key = errorKey(item);
        if (!errors.has(key)) errors.set(key, item);
      } else if (item.type === 'fallback') {
        if (!hasFallback) {
          other.push(item);
          hasFallback = true;
        }
      } else if (item.type === 'receive') {
        if (!hasReceive) {
          other.push(item);
          hasReceive = true;
        }
      } else if (item.type === 'constructor') {
        if (!hasConstructor) {
          other.push(item);
          hasConstructor = true;
        }
      }
    }
  }

  return [...functions.values(), ...events.values(), ...errors.values(), ...other] as Abi;
}

function eventKey(item: { name?: string; inputs?: readonly { type: string }[] }): string {
  const types = (item.inputs ?? []).map((i) => i.type).join(',');
  return `event:${item.name ?? ''}(${types})`;
}

function errorKey(item: { name?: string; inputs?: readonly { type: string }[] }): string {
  const types = (item.inputs ?? []).map((i) => i.type).join(',');
  return `error:${item.name ?? ''}(${types})`;
}
