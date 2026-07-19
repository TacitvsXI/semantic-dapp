import { isAddress, getAddress } from 'viem';
import type { NormalizedParameter } from '@semantic-dapp/spec';
import type { FieldValue } from './types.js';
import { elementType, isArrayType, isTupleType } from './widget.js';

export interface EncodeResult {
  ok: boolean;
  value?: unknown;
  error?: string;
}

function fail(error: string): EncodeResult {
  return { ok: false, error };
}

function encodeScalar(type: string, raw: string): EncodeResult {
  const trimmed = raw.trim();

  if (type === 'address') {
    if (!isAddress(trimmed)) return fail(`Invalid address: "${trimmed}"`);
    return { ok: true, value: getAddress(trimmed) };
  }

  if (type === 'bool') {
    if (trimmed === 'true' || trimmed === '1') return { ok: true, value: true };
    if (trimmed === 'false' || trimmed === '0' || trimmed === '') return { ok: true, value: false };
    return fail(`Invalid boolean: "${trimmed}"`);
  }

  const uintMatch = /^u?int(\d*)$/.exec(type);
  if (uintMatch) {
    if (trimmed === '') return fail('Value is required');
    let parsed: bigint;
    try {
      parsed = BigInt(trimmed);
    } catch {
      return fail(`Invalid integer: "${trimmed}"`);
    }
    if (type.startsWith('uint') && parsed < 0n) {
      return fail('Unsigned integer cannot be negative');
    }
    return { ok: true, value: parsed };
  }

  const bytesMatch = /^bytes(\d*)$/.exec(type);
  if (bytesMatch) {
    if (!/^0x[0-9a-fA-F]*$/.test(trimmed)) {
      return fail(`Invalid hex bytes: "${trimmed}"`);
    }
    const fixed = bytesMatch[1];
    if (fixed) {
      const expectedChars = Number(fixed) * 2 + 2;
      if (trimmed.length !== expectedChars) {
        return fail(`bytes${fixed} must be exactly ${fixed} bytes`);
      }
    }
    return { ok: true, value: trimmed };
  }

  if (type === 'string') {
    return { ok: true, value: raw };
  }

  // Unknown scalar: pass through as string so nothing is silently dropped.
  return { ok: true, value: raw };
}

/** Encode a single field value into an ABI argument for a parameter. */
export function encodeParam(param: NormalizedParameter, value: FieldValue): EncodeResult {
  const { type } = param;

  if (isArrayType(type)) {
    if (!Array.isArray(value)) return fail(`Expected a list for ${type}`);
    const base: NormalizedParameter = { ...param, type: elementType(type) };
    const out: unknown[] = [];
    for (let i = 0; i < value.length; i += 1) {
      const result = encodeParam(base, value[i]!);
      if (!result.ok) return fail(`[${i}] ${result.error}`);
      out.push(result.value);
    }
    return { ok: true, value: out };
  }

  if (isTupleType(type)) {
    if (!Array.isArray(value)) return fail('Expected tuple values');
    const components = param.components ?? [];
    const out: unknown[] = [];
    for (let i = 0; i < components.length; i += 1) {
      const result = encodeParam(components[i]!, value[i] ?? '');
      if (!result.ok) return fail(`${components[i]!.name}: ${result.error}`);
      out.push(result.value);
    }
    return { ok: true, value: out };
  }

  if (typeof value !== 'string') return fail(`Expected a value for ${type}`);
  return encodeScalar(type, value);
}

export interface EncodeInputsResult {
  ok: boolean;
  values?: unknown[];
  errors: (string | undefined)[];
}

/** Encode all inputs of a function; returns per-field errors when invalid. */
export function encodeInputs(
  params: NormalizedParameter[],
  values: FieldValue[],
): EncodeInputsResult {
  const out: unknown[] = [];
  const errors: (string | undefined)[] = [];
  let ok = true;
  params.forEach((param, index) => {
    const result = encodeParam(param, values[index] ?? '');
    if (result.ok) {
      out.push(result.value);
      errors.push(undefined);
    } else {
      ok = false;
      out.push(undefined);
      errors.push(result.error);
    }
  });
  return ok ? { ok, values: out, errors } : { ok, errors };
}
