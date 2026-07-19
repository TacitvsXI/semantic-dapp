import { getAddress, type Address, type Hex } from 'viem';
import type { ChainReader, ProxyInfo } from './types.js';

/** EIP-1967 storage slots. */
export const EIP1967_IMPLEMENTATION_SLOT: Hex =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
export const EIP1967_ADMIN_SLOT: Hex =
  '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
export const EIP1967_BEACON_SLOT: Hex =
  '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';

/** `implementation()` selector used by beacon contracts (and some proxies). */
const IMPLEMENTATION_SELECTOR: Hex = '0x5c60da1b';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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

  return { isProxy: false, kind: 'unknown' };
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
