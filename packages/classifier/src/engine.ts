import type {
  Audience,
  ContractFunction,
  ContractModel,
  Evidence,
  OperationType,
  RiskLevel,
  Visibility,
} from '@semantic-dapp/spec';
import type { AccessModel, ResolvedStandards } from '@semantic-dapp/analyzer';

/** Everything a rule needs to judge a single function. */
export interface RuleContext {
  func: ContractFunction;
  model: ContractModel;
  standards: ResolvedStandards;
  access: AccessModel;
}

/** A partial classification suggested by one rule. */
export interface RuleMatch {
  operationType?: OperationType;
  audience?: Audience;
  title?: string;
  description?: string;
  risk?: RiskLevel;
  isRead?: boolean;
  /** Standard id that backs this match, used for input-widget refinement. */
  standard?: string;
  /** This rule's confidence in [0, 1]. */
  confidence: number;
  /** One human-readable justification. */
  evidence: Evidence;
  /** Higher wins field conflicts; ties broken by confidence. */
  priority: number;
}

export interface ClassificationRule {
  id: string;
  match(ctx: RuleContext): RuleMatch | undefined;
}

/** The engine's resolved verdict for one function. */
export interface ResolvedClassification {
  operationType: OperationType;
  audience: Audience;
  title: string;
  description?: string;
  risk?: RiskLevel;
  isRead: boolean;
  visibility: Visibility;
  confidence: number;
  evidence: Evidence[];
  standard?: string;
}

/** Pick the value from the highest-priority match that defines `field`. */
function resolveField<K extends keyof RuleMatch>(
  matches: RuleMatch[],
  field: K,
): RuleMatch[K] | undefined {
  for (const m of matches) {
    const value = m[field];
    if (value !== undefined) return value;
  }
  return undefined;
}

/**
 * Run all rules against a function and resolve a single classification. Each
 * field is taken from the highest-priority match that provides it; confidence
 * comes from the match that set the operation type; evidence accumulates from
 * every match so the decision is transparent (ADR-006). Never returns nothing —
 * the fallback rule guarantees a verdict.
 */
export function runRules(ctx: RuleContext, rules: ClassificationRule[]): ResolvedClassification {
  const matches: RuleMatch[] = [];
  for (const rule of rules) {
    const m = rule.match(ctx);
    if (m) matches.push(m);
  }
  // Highest priority first, then higher confidence.
  matches.sort((a, b) => b.priority - a.priority || b.confidence - a.confidence);

  const typeMatch = matches.find((m) => m.operationType !== undefined);
  const operationType = typeMatch?.operationType ?? (ctx.func.isRead ? 'read' : 'unknown');
  const audience = resolveField(matches, 'audience') ?? 'developer';
  const title = resolveField(matches, 'title') ?? ctx.func.name;
  const description = resolveField(matches, 'description');
  const risk = resolveField(matches, 'risk');
  const standard = resolveField(matches, 'standard');
  const confidence = typeMatch?.confidence ?? (ctx.func.isRead ? 0.3 : 0.2);

  const visibility: Visibility = audience === 'developer' ? 'raw-only' : 'visible';

  const resolved: ResolvedClassification = {
    operationType,
    audience,
    title,
    isRead: ctx.func.isRead,
    visibility,
    confidence: Math.min(1, confidence),
    evidence: matches.map((m) => m.evidence),
  };
  if (description !== undefined) resolved.description = description;
  if (risk !== undefined) resolved.risk = risk;
  if (standard !== undefined) resolved.standard = standard;
  return resolved;
}
