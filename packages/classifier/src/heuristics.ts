import type { Audience, OperationType, RiskLevel } from '@semantic-dapp/spec';
import type { ClassificationRule, RuleContext, RuleMatch } from './engine.js';

/** Convert a camelCase / snake_case identifier into a Title Case label. */
export function humanize(name: string): string {
  const spaced = name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  if (!spaced) return name;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/* ----------------------------- standard rule ----------------------------- */

/** Authoritative: route by a detected standard's semantic (ADR-005). */
export const standardRule: ClassificationRule = {
  id: 'standard',
  match(ctx: RuleContext): RuleMatch | undefined {
    const resolved = ctx.standards.semantics.get(ctx.func.signature);
    if (!resolved) return undefined;
    const { semantic, standard, confidence } = resolved;
    const match: RuleMatch = {
      operationType: semantic.operationType,
      audience: semantic.audience,
      title: semantic.title,
      isRead: semantic.isRead,
      standard,
      confidence: Math.min(1, confidence || 0.9),
      evidence: {
        source: 'signature',
        detail: `Matches ${standard} rule for ${ctx.func.signature}`,
        weight: Math.min(1, confidence || 0.9),
      },
      priority: 100,
    };
    if (semantic.description) match.description = semantic.description;
    if (semantic.risk) match.risk = semantic.risk;
    return match;
  },
};

/* ---------------------------- name heuristics ---------------------------- */

interface NameRule {
  test: RegExp;
  operationType: OperationType;
  audience: Audience;
  risk?: RiskLevel;
  title: string;
  description?: string;
}

/** First match wins. Patterns run against the lowercased function name. */
const NAME_RULES: NameRule[] = [
  { test: /^mint/, operationType: 'token-mint', audience: 'admin', risk: 'high', title: 'Mint' },
  { test: /^burn/, operationType: 'token-burn', audience: 'user', risk: 'medium', title: 'Burn' },
  {
    test: /^(unpause|resume)/,
    operationType: 'unpause',
    audience: 'emergency',
    risk: 'medium',
    title: 'Unpause',
  },
  {
    test: /^(pause|freeze|halt)/,
    operationType: 'pause',
    audience: 'emergency',
    risk: 'high',
    title: 'Pause',
  },
  {
    test: /^emergency/,
    operationType: 'fund-withdraw',
    audience: 'emergency',
    risk: 'critical',
    title: 'Emergency action',
  },
  {
    test: /(rescue|sweep|skim|recover|reclaim)/,
    operationType: 'fund-withdraw',
    audience: 'admin',
    risk: 'high',
    title: 'Recover funds',
    description: 'Moves funds out of the contract. Privileged.',
  },
  {
    test: /^withdraw/,
    operationType: 'fund-withdraw',
    audience: 'admin',
    risk: 'medium',
    title: 'Withdraw',
  },
  {
    test: /(claim|harvest|getreward|collect)/,
    operationType: 'claim',
    audience: 'user',
    risk: 'low',
    title: 'Claim',
  },
  {
    test: /^(deposit|stake|supply|provide)/,
    operationType: 'fund-deposit',
    audience: 'user',
    risk: 'low',
    title: 'Deposit',
  },
  {
    test: /^(set|update|config|configure|change|add|remove|register|deregister|whitelist|blacklist|allow|deny|enable|disable|grant|revoke)/,
    operationType: 'admin-config',
    audience: 'admin',
    risk: 'medium',
    title: 'Update configuration',
  },
];

/** Route non-standard writers by common naming conventions. */
export const nameHeuristicRule: ClassificationRule = {
  id: 'name-heuristic',
  match(ctx: RuleContext): RuleMatch | undefined {
    if (ctx.func.isRead) return undefined;
    const name = ctx.func.name.toLowerCase();
    for (const rule of NAME_RULES) {
      if (!rule.test.test(name)) continue;
      const match: RuleMatch = {
        operationType: rule.operationType,
        audience: rule.audience,
        title: rule.title,
        confidence: 0.5,
        evidence: {
          source: 'name',
          detail: `Function name "${ctx.func.name}" suggests ${rule.operationType}`,
          weight: 0.5,
        },
        priority: 50,
      };
      if (rule.risk) match.risk = rule.risk;
      if (rule.description) match.description = rule.description;
      return match;
    }
    return undefined;
  },
};

/* ---------------------------- risk heuristics ---------------------------- */

const DESTRUCTIVE = /(selfdestruct|destroy|\bkill\b|shutdown|drain|rug|nuke)/;
const DANGEROUS = /(withdrawall|emergencywithdraw|migrate|setowner|setadmin|upgrade)/;

/**
 * Raise the risk level for dangerous shapes without changing routing. Higher
 * priority than name heuristics for the risk field only (it never sets a type),
 * but standards (priority 100) still win.
 */
export const riskHeuristicRule: ClassificationRule = {
  id: 'risk-heuristic',
  match(ctx: RuleContext): RuleMatch | undefined {
    if (ctx.func.isRead) return undefined;
    const name = ctx.func.name.toLowerCase();
    if (DESTRUCTIVE.test(name)) {
      return {
        risk: 'critical',
        confidence: 0.5,
        evidence: {
          source: 'name',
          detail: `"${ctx.func.name}" looks destructive; flagged critical`,
        },
        priority: 70,
      };
    }
    if (DANGEROUS.test(name)) {
      return {
        risk: 'high',
        confidence: 0.5,
        evidence: { source: 'name', detail: `"${ctx.func.name}" is a high-risk operation` },
        priority: 70,
      };
    }
    if (ctx.func.isPayable) {
      return {
        risk: 'medium',
        confidence: 0.4,
        evidence: { source: 'signature', detail: `${ctx.func.name} is payable (accepts value)` },
        priority: 70,
      };
    }
    return undefined;
  },
};

/* -------------------------------- reads ---------------------------------- */

/** Surface view/pure functions in the Read tab. */
export const readRule: ClassificationRule = {
  id: 'read',
  match(ctx: RuleContext): RuleMatch | undefined {
    if (!ctx.func.isRead) return undefined;
    return {
      operationType: 'read',
      audience: 'user',
      title: humanize(ctx.func.name),
      isRead: true,
      confidence: 0.35,
      evidence: { source: 'signature', detail: `${ctx.func.name} is a view/pure read` },
      priority: 30,
    };
  },
};

/* ------------------------------- fallback -------------------------------- */

/** Last resort: an unknown writer stays reachable in the Raw tab (ADR-001). */
export const fallbackRule: ClassificationRule = {
  id: 'fallback',
  match(ctx: RuleContext): RuleMatch | undefined {
    return {
      operationType: ctx.func.isRead ? 'read' : 'unknown',
      audience: 'developer',
      title: ctx.func.name,
      isRead: ctx.func.isRead,
      confidence: ctx.func.isRead ? 0.3 : 0.2,
      evidence: {
        source: 'name',
        detail: 'No deterministic rule matched; available in the Raw tab.',
      },
      priority: 0,
    };
  },
};

/** Rules in descending priority order. */
export const DEFAULT_RULES: ClassificationRule[] = [
  standardRule,
  riskHeuristicRule,
  nameHeuristicRule,
  readRule,
  fallbackRule,
];
