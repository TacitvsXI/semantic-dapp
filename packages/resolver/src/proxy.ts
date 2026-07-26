import { getAddress, type Address, type Hex } from 'viem';
import type { ChainReader, ProxyInfo } from './types.js';

/** EIP-1967 storage slots. */
export const EIP1967_IMPLEMENTATION_SLOT: Hex =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
export const EIP1967_ADMIN_SLOT: Hex =
  '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
export const EIP1967_BEACON_SLOT: Hex =
  '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';

/** `implementation()` selector used by beacon contracts (and legacy proxies). */
const IMPLEMENTATION_SELECTOR: Hex = '0x5c60da1b';
/** `masterCopy()` selector used by Gnosis Safe (v1.0) proxies. */
const MASTERCOPY_SELECTOR: Hex = '0xa619486e';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * EIP-1167 minimal-proxy runtime bytecode. The 20-byte implementation address is
 * spliced between a fixed prefix and suffix. We match the canonical form and the
 * PUSH0 (Shanghai) variant; the capture group is the implementation address.
 */
const EIP1167_PATTERNS: RegExp[] = [
  /^0x363d3d373d3d3d363d73([0-9a-f]{40})5af43d82803e903d91602b57fd5bf3$/i,
  /^0x365f5f375f5f5f365f73([0-9a-f]{40})5af43d5f5f3e5f3d91602a57fd5bf3$/i,
];

/** Parse the implementation address out of EIP-1167 minimal-proxy bytecode. */
export function minimalProxyImplementation(code: Hex | undefined): Address | undefined {
  if (!code || code === '0x') return undefined;
  for (const pattern of EIP1167_PATTERNS) {
    const match = pattern.exec(code);
    if (match?.[1]) {
      try {
        return getAddress(`0x${match[1]}`);
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/** Extract a checksummed address from a 32-byte storage word, or undefined. */
export function addressFromStorageWord(word: Hex | undefined): Address | undefined {
  if (!word) return undefined;
  const hex = word.slice(2).padStart(64, '0');
  const tail = hex.slice(-40);
  const candidate = `0x${tail}`;
  if (candidate.toLowerCase() === ZERO_ADDRESS) return undefined;
  try {
    return getAddress(candidate);
  } catch {
    return undefined;
  }
}

/**
 * Detect an EIP-1967 (transparent/UUPS/beacon) proxy and resolve the
 * implementation address. Falls back to `isProxy: false` for plain contracts.
 */
export async function detectProxy(reader: ChainReader, address: Address): Promise<ProxyInfo> {
  const [implWord, adminWord, beaconWord] = await Promise.all([
    reader.getStorageAt({ address, slot: EIP1967_IMPLEMENTATION_SLOT }),
    reader.getStorageAt({ address, slot: EIP1967_ADMIN_SLOT }),
    reader.getStorageAt({ address, slot: EIP1967_BEACON_SLOT }),
  ]);

  const implementation = addressFromStorageWord(implWord);
  const admin = addressFromStorageWord(adminWord);
  const beacon = addressFromStorageWord(beaconWord);

  if (beacon) {
    const beaconImpl = await beaconImplementation(reader, beacon);
    return {
      isProxy: true,
      kind: 'eip1967-beacon',
      beacon,
      ...(beaconImpl ? { implementation: beaconImpl } : {}),
      ...(admin ? { admin } : {}),
    };
  }

  if (implementation) {
    // Transparent proxies set the admin slot; UUPS keep upgrade logic in the impl.
    const kind = admin ? 'eip1967-transparent' : 'eip1967-uups';
    return {
      isProxy: true,
      kind,
      implementation,
      ...(admin ? { admin } : {}),
    };
  }

  // EIP-1167 minimal proxy (clone): implementation is baked into the bytecode.
  const clone = minimalProxyImplementation(await safeGetCode(reader, address));
  if (clone) {
    return { isProxy: true, kind: 'eip1167-minimal', implementation: clone };
  }

  // Legacy proxies: a plain `implementation()` getter (EIP-1822/OZ pre-1967).
  const legacyImpl = await callAddressGetter(reader, address, IMPLEMENTATION_SELECTOR);
  if (legacyImpl && (await hasCode(reader, legacyImpl))) {
    return { isProxy: true, kind: 'legacy-implementation', implementation: legacyImpl };
  }

  // Gnosis Safe proxies expose `masterCopy()`.
  const masterCopy = await callAddressGetter(reader, address, MASTERCOPY_SELECTOR);
  if (masterCopy && (await hasCode(reader, masterCopy))) {
    return { isProxy: true, kind: 'gnosis-safe', implementation: masterCopy };
  }

  return { isProxy: false, kind: 'unknown' };
}

async function safeGetCode(reader: ChainReader, address: Address): Promise<Hex | undefined> {
  try {
    return await reader.getCode({ address });
  } catch {
    return undefined;
  }
}

async function hasCode(reader: ChainReader, address: Address): Promise<boolean> {
  const code = await safeGetCode(reader, address);
  return !!code && code !== '0x';
}

/** Call a zero-arg selector that returns an address; undefined if it reverts/zero. */
async function callAddressGetter(
  reader: ChainReader,
  address: Address,
  selector: Hex,
): Promise<Address | undefined> {
  try {
    const data = await reader.call({ to: address, data: selector });
    return addressFromStorageWord(data);
  } catch {
    return undefined;
  }
}

async function beaconImplementation(
  reader: ChainReader,
  beacon: Address,
): Promise<Address | undefined> {
  try {
    const data = await reader.call({ to: beacon, data: IMPLEMENTATION_SELECTOR });
    return addressFromStorageWord(data);
  } catch {
    return undefined;
  }
}
