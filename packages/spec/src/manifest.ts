import { z } from 'zod';

/** Who a given operation is meant for. Drives UI routing. */
export const audienceSchema = z.enum(['user', 'operator', 'admin', 'emergency', 'developer']);
export type Audience = z.infer<typeof audienceSchema>;

/** Semantic type of an operation. Extended over later phases. */
export const operationTypeSchema = z.enum([
  'token-transfer',
  'token-approve',
  'token-mint',
  'token-burn',
  'vault-deposit',
  'vault-withdraw',
  'role-grant',
  'role-revoke',
  'role-renounce',
  'pause',
  'unpause',
  'upgrade',
  'ownership-transfer',
  // Generic buckets for non-standard functions (ADR-006). Additive: older
  // manifests never used these, so no schema migration is required.
  'admin-config',
  'fund-withdraw',
  'fund-deposit',
  'claim',
  'read',
  'unknown',
]);
export type OperationType = z.infer<typeof operationTypeSchema>;

/** Risk level attached to an operation. */
export const riskLevelSchema = z.enum(['none', 'low', 'medium', 'high', 'critical']);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

/** Whether/where the operation shows up in generated UI. */
export const visibilitySchema = z.enum(['visible', 'hidden', 'raw-only']);
export type Visibility = z.infer<typeof visibilitySchema>;

/** UI widget used to render a single input. */
export const inputWidgetSchema = z.enum([
  'address',
  'token-amount',
  'native-amount',
  'integer',
  'bounded-integer',
  'bps',
  'timestamp',
  'boolean',
  'enum',
  'bytes',
  'tuple',
  'array',
  'token-id',
  'address-array',
  'numeric-array',
  'raw',
]);
export type InputWidget = z.infer<typeof inputWidgetSchema>;

/** Where a piece of evidence came from. */
export const evidenceSourceSchema = z.enum([
  'selector',
  'signature',
  'interface-id',
  'name',
  'natspec',
  'event',
  'metadata',
  'modifier',
  'source-ast',
  'simulation',
]);
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;

/** A single, human-readable justification for a classification decision. */
export const evidenceSchema = z.object({
  source: evidenceSourceSchema,
  detail: z.string(),
  /** Contribution to the confidence score (can be negative). */
  weight: z.number().optional(),
});
export type Evidence = z.infer<typeof evidenceSchema>;

/** How access to an operation is gated on-chain. */
export const permissionSchema = z.object({
  kind: z.enum(['none', 'ownable', 'access-control', 'custom']),
  role: z.string().optional(),
  reader: z.string().optional(),
});
export type Permission = z.infer<typeof permissionSchema>;

/** A resolved definition of a single function input. */
export const inputDefinitionSchema = z.object({
  name: z.string(),
  /** Solidity type, e.g. `uint256`, `address`, `tuple`. */
  type: z.string(),
  widget: inputWidgetSchema,
  label: z.string().optional(),
  description: z.string().optional(),
  /** For token-amount widgets: which token supplies decimals (`self` or address). */
  token: z.string().optional(),
  /** For bounded-integer widgets. */
  min: z.string().optional(),
  max: z.string().optional(),
  options: z.array(z.string()).optional(),
});
export type InputDefinition = z.infer<typeof inputDefinitionSchema>;

/** Confidence bounded to [0, 1]. */
export const confidenceSchema = z.number().min(0).max(1);

/** A single classified operation derived from an ABI function. */
export const operationDefinitionSchema = z.object({
  id: z.string(),
  contract: z.string(),
  /** Canonical function signature, e.g. `transfer(address,uint256)`. */
  function: z.string(),
  selector: z
    .string()
    .regex(/^0x[0-9a-fA-F]{8}$/)
    .optional(),
  title: z.string(),
  description: z.string().optional(),
  audience: audienceSchema,
  operationType: operationTypeSchema,
  isRead: z.boolean(),
  confidence: confidenceSchema,
  evidence: z.array(evidenceSchema).default([]),
  risk: z
    .object({
      level: riskLevelSchema,
      reason: z.string().optional(),
    })
    .optional(),
  permission: permissionSchema.optional(),
  inputs: z.array(inputDefinitionSchema).default([]),
  visibility: visibilitySchema.default('visible'),
  /** Set when a human confirmed or edited the auto-classification. */
  reviewed: z.boolean().default(false),
});
export type OperationDefinition = z.infer<typeof operationDefinitionSchema>;

/** Identity of an analyzed contract, including proxy/implementation fingerprints. */
export const contractDefinitionSchema = z.object({
  id: z.string(),
  chainId: z.number().int().positive().optional(),
  address: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
  name: z.string().optional(),
  implementationAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
  implementationCodeHash: z.string().optional(),
  abiSource: z.enum(['manual', 'explorer', 'sourcify', 'artifact', 'unknown']).default('unknown'),
  standards: z.array(z.string()).default([]),
});
export type ContractDefinition = z.infer<typeof contractDefinitionSchema>;

/** The machine-readable representation of what the system understood. */
export const semanticManifestSchema = z.object({
  version: z.literal(1),
  project: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
  contracts: z.array(contractDefinitionSchema).min(1),
  operations: z.array(operationDefinitionSchema).default([]),
});
export type SemanticManifest = z.infer<typeof semanticManifestSchema>;

/** Confidence thresholds used across analyzer, classifier and renderer (ADR-001). */
export const CONFIDENCE_THRESHOLDS = {
  autoConfirm: 0.9,
  suggested: 0.7,
  developerReview: 0.4,
} as const;

/** Map a confidence score to the routing tier documented in ADR-001. */
export function confidenceTier(confidence: number): 'auto' | 'suggested' | 'review' | 'raw-only' {
  if (confidence >= CONFIDENCE_THRESHOLDS.autoConfirm) return 'auto';
  if (confidence >= CONFIDENCE_THRESHOLDS.suggested) return 'suggested';
  if (confidence >= CONFIDENCE_THRESHOLDS.developerReview) return 'review';
  return 'raw-only';
}

/** Validate an unknown value as a {@link SemanticManifest}. */
export function parseManifest(input: unknown): SemanticManifest {
  return semanticManifestSchema.parse(input);
}

/** Safe variant of {@link parseManifest}. */
export function safeParseManifest(input: unknown) {
  return semanticManifestSchema.safeParse(input);
}
