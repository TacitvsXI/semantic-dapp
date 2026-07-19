import { formatUnits, isAddress, getAddress } from 'viem';
import type { NormalizedParameter } from '@semantic-dapp/spec';

/** A JSON-friendly, display-ready representation of a decoded value. */
export type DisplayValue = string | DisplayValue[] | { [key: string]: DisplayValue };

/**
 * Convert an arbitrary decoded ABI value into a JSON-serializable display value.
 * bigints become decimal strings, addresses are checksummed, nested
 * tuples/arrays are preserved structurally.
 */
export function toDisplayValue(value: unknown): DisplayValue {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') {
    return isAddress(value) ? getAddress(value) : value;
  }
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(toDisplayValue);
  if (typeof value === 'object') {
    const out: Record<string, DisplayValue> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = toDisplayValue(val);
    }
    return out;
  }
  return String(value);
}

export interface FormattedOutput {
  name: string;
  type: string;
  value: DisplayValue;
}

/**
 * Pair a contract call's decoded result with its output parameter definitions.
 * viem returns a bare value for a single output and an array for multiple.
 */
export function formatReadResult(outputs: NormalizedParameter[], raw: unknown): FormattedOutput[] {
  if (outputs.length === 0) {
    return raw === undefined
      ? []
      : [{ name: 'result', type: 'unknown', value: toDisplayValue(raw) }];
  }
  if (outputs.length === 1) {
    const output = outputs[0]!;
    return [{ name: output.name || 'result', type: output.type, value: toDisplayValue(raw) }];
  }
  const values = Array.isArray(raw) ? raw : [raw];
  return outputs.map((output, index) => ({
    name: output.name || `output${index}`,
    type: output.type,
    value: toDisplayValue(values[index]),
  }));
}

/** Format a raw token amount using its decimals, for human-readable display. */
export function formatTokenAmount(value: bigint, decimals: number): string {
  return formatUnits(value, decimals);
}
