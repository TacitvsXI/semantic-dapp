import { getAddress, isAddress } from 'viem';

/** Live, as-you-type feedback for a single scalar field. */
export interface FieldFeedback {
  tone: 'ok' | 'error';
  text: string;
  /** Optional confirming value (e.g. the checksummed address, parsed integer). */
  code?: string;
}

/**
 * Validate a scalar ABI value as the user types and return friendly feedback:
 * a green "accepted" (with the checksummed address / parsed integer echoed back)
 * or an inline error. Returns `null` for empty input and for types where live
 * feedback would only add noise (bool, string, unknown), so the form stays calm
 * until there is something to confirm or correct.
 *
 * Mirrors the encoder in `encode.ts` (same accept/reject rules) but is
 * side-effect free and produces UI copy instead of ABI values.
 */
export function scalarFeedback(type: string, raw: string): FieldFeedback | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  if (type === 'address') {
    if (!isAddress(trimmed, { strict: false })) {
      return { tone: 'error', text: 'Not a valid address - expected 0x followed by 40 hex.' };
    }
    const checksummed = getAddress(trimmed);
    return {
      tone: 'ok',
      text: checksummed === trimmed ? 'Address accepted' : 'Address accepted (checksummed)',
      code: checksummed,
    };
  }

  const uintMatch = /^u?int(\d*)$/.exec(type);
  if (uintMatch) {
    let parsed: bigint;
    try {
      parsed = BigInt(trimmed);
    } catch {
      return { tone: 'error', text: `Not a valid integer: "${trimmed}"` };
    }
    if (type.startsWith('uint') && parsed < 0n) {
      return { tone: 'error', text: 'Unsigned integer cannot be negative.' };
    }
    return { tone: 'ok', text: 'Accepted', code: parsed.toString() };
  }

  const bytesMatch = /^bytes(\d*)$/.exec(type);
  if (bytesMatch) {
    if (!/^0x[0-9a-fA-F]*$/.test(trimmed)) {
      return { tone: 'error', text: `Not valid hex - expected 0x followed by hex digits.` };
    }
    const fixed = bytesMatch[1];
    if (fixed) {
      const expectedChars = Number(fixed) * 2 + 2;
      if (trimmed.length !== expectedChars) {
        return { tone: 'error', text: `bytes${fixed} must be exactly ${fixed} bytes.` };
      }
    }
    return { tone: 'ok', text: `Valid ${type}` };
  }

  // string / unknown scalar: no live feedback (any input is acceptable).
  return null;
}
