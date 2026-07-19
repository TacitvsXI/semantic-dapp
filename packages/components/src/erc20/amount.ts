import { parseUnits, formatUnits, maxUint256 } from 'viem';

export interface ParsedAmount {
  ok: boolean;
  value?: bigint;
  error?: string;
}

/** Parse a human-entered token amount (e.g. "1.5") into base units. */
export function parseTokenAmount(raw: string, decimals: number): ParsedAmount {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: false, error: 'Amount is required' };
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === '.') {
    return { ok: false, error: `Invalid amount: "${trimmed}"` };
  }
  const fractional = trimmed.split('.')[1];
  if (fractional && fractional.length > decimals) {
    return { ok: false, error: `At most ${decimals} decimal places allowed` };
  }
  try {
    return { ok: true, value: parseUnits(trimmed, decimals) };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** Format base units to a human string. */
export function displayTokenAmount(value: bigint, decimals: number): string {
  return formatUnits(value, decimals);
}

/** The "infinite" allowance value. */
export const MAX_UINT256 = maxUint256;
