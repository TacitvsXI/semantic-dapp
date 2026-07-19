import type { InputWidget } from './manifest.js';
import type { NormalizedParameter } from './abi.js';

/** Is this an array type, e.g. `uint256[]` or `address[3]`? */
export function isArrayType(type: string): boolean {
  return /\[\d*\]$/.test(type);
}

/** Strip one array level: `uint256[][]` -> `uint256[]`, `address[3]` -> `address`. */
export function elementType(type: string): string {
  return type.replace(/\[\d*\]$/, '');
}

/** Is this a tuple type (`tuple`, `tuple[]`, ...)? */
export function isTupleType(type: string): boolean {
  return elementType(type) === 'tuple' || type.startsWith('tuple');
}

/** Pick a default UI widget for an ABI parameter type. */
export function inputWidgetForType(param: NormalizedParameter): InputWidget {
  const { type } = param;
  if (isArrayType(type)) {
    const base = elementType(type);
    if (base === 'address') return 'address-array';
    if (/^u?int\d*$/.test(base)) return 'numeric-array';
    return 'array';
  }
  if (isTupleType(type)) return 'tuple';
  if (type === 'address') return 'address';
  if (type === 'bool') return 'boolean';
  if (/^u?int\d*$/.test(type)) return 'integer';
  if (/^bytes\d*$/.test(type)) return 'bytes';
  return 'raw';
}
