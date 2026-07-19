import { z } from 'zod';
import type { Abi } from 'abitype';

/**
 * Permissive runtime validator for ABI JSON pasted or uploaded by a user.
 * It checks structural shape (enough to normalize) without reimplementing the
 * whole Solidity type system. The result is cast to abitype's {@link Abi}.
 */
const abiParameterSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    name: z.string().optional(),
    type: z.string(),
    internalType: z.string().optional(),
    indexed: z.boolean().optional(),
    components: z.array(abiParameterSchema).optional(),
  }),
);

const abiItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('function'),
    name: z.string(),
    inputs: z.array(abiParameterSchema).default([]),
    outputs: z.array(abiParameterSchema).default([]),
    stateMutability: z.enum(['pure', 'view', 'nonpayable', 'payable']).optional(),
    constant: z.boolean().optional(),
    payable: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('event'),
    name: z.string(),
    inputs: z.array(abiParameterSchema).default([]),
    anonymous: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('error'),
    name: z.string(),
    inputs: z.array(abiParameterSchema).default([]),
  }),
  z.object({
    type: z.literal('constructor'),
    inputs: z.array(abiParameterSchema).default([]),
    stateMutability: z.enum(['nonpayable', 'payable']).optional(),
  }),
  z.object({ type: z.literal('fallback'), stateMutability: z.string().optional() }),
  z.object({ type: z.literal('receive'), stateMutability: z.string().optional() }),
]);

export const abiSchema = z.array(abiItemSchema).min(1, 'ABI must contain at least one item');

export interface ParseAbiResult {
  success: boolean;
  abi?: Abi;
  error?: string;
}

/**
 * Parse and validate ABI from an unknown value (already `JSON.parse`d).
 * Also accepts Foundry/Hardhat artifacts that wrap the ABI under an `abi` key.
 */
export function parseAbi(input: unknown): ParseAbiResult {
  let candidate: unknown = input;
  if (
    candidate &&
    typeof candidate === 'object' &&
    !Array.isArray(candidate) &&
    'abi' in candidate
  ) {
    candidate = (candidate as { abi: unknown }).abi;
  }

  const result = abiSchema.safeParse(candidate);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => i.message).join('; ') };
  }
  return { success: true, abi: result.data as unknown as Abi };
}

/** Parse ABI from a JSON string (raw ABI array or an artifact wrapper). */
export function parseAbiJson(json: string): ParseAbiResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return { success: false, error: `Invalid JSON: ${(error as Error).message}` };
  }
  return parseAbi(parsed);
}
