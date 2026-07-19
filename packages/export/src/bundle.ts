import { z } from 'zod';
import { abiSchema, semanticManifestSchema } from '@semantic-dapp/spec';

/** Current bundle format version. Bump when the shape changes incompatibly. */
export const BUNDLE_VERSION = 1;

export const generatorSchema = z.object({
  name: z.string(),
  version: z.string(),
});

/**
 * A portable, self-contained artifact that a standalone app renders: the
 * contract's identity, its ABI and the reviewed semantic manifest. This is the
 * only thing that crosses the export boundary (ADR-009).
 */
export const semanticBundleSchema = z.object({
  bundleVersion: z.literal(BUNDLE_VERSION),
  generator: generatorSchema,
  /** ISO-8601 timestamp of when the bundle was produced. */
  generatedAt: z.string(),
  /** Human-facing app name. */
  name: z.string().min(1, 'Bundle name is required'),
  chainId: z.number().int().positive(),
  rpcUrl: z.string().optional(),
  address: z.string().optional(),
  contractName: z.string().optional(),
  explorerUrl: z.string().optional(),
  abi: abiSchema,
  manifest: semanticManifestSchema,
});

export type SemanticBundle = z.infer<typeof semanticBundleSchema>;
export type Generator = z.infer<typeof generatorSchema>;

const DEFAULT_GENERATOR: Generator = { name: 'semantic-dapp', version: '0.0.1' };

export interface BuildBundleInput {
  name: string;
  chainId: number;
  abi: SemanticBundle['abi'];
  manifest: SemanticBundle['manifest'];
  rpcUrl?: string;
  address?: string;
  contractName?: string;
  explorerUrl?: string;
  generator?: Generator;
  /** Override the timestamp (mainly for deterministic tests). */
  generatedAt?: string;
}

/**
 * Assemble and validate a {@link SemanticBundle}, filling the generator and
 * timestamp defaults. Throws (via zod) if identity, ABI or manifest are invalid.
 */
export function buildBundle(input: BuildBundleInput): SemanticBundle {
  const candidate = {
    bundleVersion: BUNDLE_VERSION,
    generator: input.generator ?? DEFAULT_GENERATOR,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    name: input.name,
    chainId: input.chainId,
    ...(input.rpcUrl ? { rpcUrl: input.rpcUrl } : {}),
    ...(input.address ? { address: input.address } : {}),
    ...(input.contractName ? { contractName: input.contractName } : {}),
    ...(input.explorerUrl ? { explorerUrl: input.explorerUrl } : {}),
    abi: input.abi,
    manifest: input.manifest,
  };
  return semanticBundleSchema.parse(candidate);
}

export interface ParseResult {
  ok: boolean;
  bundle?: SemanticBundle;
  error?: string;
}

/** Safely parse an unknown value (e.g. parsed JSON) into a bundle. */
export function parseBundle(value: unknown): ParseResult {
  const result = semanticBundleSchema.safeParse(value);
  if (result.success) return { ok: true, bundle: result.data };
  return { ok: false, error: result.error.issues.map((i) => i.message).join('; ') };
}

/** Turn an app name into a stable `*.bundle.json` file name. */
export function bundleFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'app'}.bundle.json`;
}
