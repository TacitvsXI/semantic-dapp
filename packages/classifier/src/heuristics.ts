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
    // `add`/`remove` are deliberately excluded: they're too generic and mislabel user
    // DeFi actions (addLiquidity/removeLiquidity) as admin. Ambiguous verbs fall through
    // to Raw rather than falsely asserting privilege.
    test: /^(set|update|config|configure|change|register|deregister|whitelist|blacklist|allow|deny|enable|disable|grant|revoke)/,
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

/* ------------------------------- mint shape ------------------------------ */

/**
 * `mint` means very different things across contracts, so route it by shape, not
 * by name alone (correctness > coverage):
 *   - payable                       -> public / paid mint (NFT drop, sale): user.
 *   - mint(address, uint256)        -> privileged token supply (OZ ERC-20): admin.
 *   - mint(uint256[, address]) etc. -> deposit-like (cToken/pool): a user action.
 *
 * ERC-4626 `mint(uint256,address)` is already handled by the standard rule
 * (priority 100), so this only sees non-standard mints. Higher priority than the
 * generic name heuristics (50) but below detected standards.
 */
export const mintShapeRule: ClassificationRule = {
  id: 'mint-shape',
  match(ctx: RuleContext): RuleMatch | undefined {
    if (ctx.func.isRead) return undefined;
    if (!/^mint/i.test(ctx.func.name)) return undefined;
    const types = ctx.func.inputs.map((i) => i.type);

    if (ctx.func.isPayable) {
      return {
        operationType: 'token-mint',
        audience: 'user',
        title: 'Mint',
        risk: 'medium',
        confidence: 0.55,
        evidence: {
          source: 'signature',
          detail: `${ctx.func.name} is payable - looks like a public/paid mint, not a privileged one`,
          weight: 0.55,
        },
        priority: 60,
      };
    }

    const privilegedShape =
      types.length === 2 && /^address$/.test(types[0] ?? '') && /^uint\d*$/.test(types[1] ?? '');
    if (privilegedShape) {
      return {
        operationType: 'token-mint',
        audience: 'admin',
        title: 'Mint',
        risk: 'high',
        confidence: 0.6,
        evidence: {
          source: 'signature',
          detail: 'mint(address,uint256) is a privileged token-supply shape',
          weight: 0.6,
        },
        priority: 60,
      };
    }

    return {
      operationType: 'fund-deposit',
      audience: 'user',
      title: 'Mint',
      risk: 'low',
      confidence: 0.5,
      evidence: {
        source: 'signature',
        detail: `${ctx.func.name}(${types.join(',')}) has no privileged-supply shape; treated as a user deposit`,
        weight: 0.5,
      },
      priority: 60,
    };
  },
};

/* ----------------------------- withdraw shape ---------------------------- */

/**
 * `withdraw` is ambiguous by name (WETH unwrap = user; BAYC `withdraw()` = owner
 * draining proceeds), so split it by shape:
 *   - withdraw(uint256 ...) -> withdraws a specified amount: a user action.
 *   - withdraw() / no amount -> drains everything: privileged (admin, high).
 * Truly definitive gating needs the source modifier (a later NatSpec pass); until
 * then this shape split is the best generalizable signal. Emergency/rescue names
 * are handled earlier by the name heuristics.
 */
export const withdrawShapeRule: ClassificationRule = {
  id: 'withdraw-shape',
  match(ctx: RuleContext): RuleMatch | undefined {
    if (ctx.func.isRead) return undefined;
    if (!/^withdraw/i.test(ctx.func.name)) return undefined;
    const firstUint = /^uint\d*$/.test(ctx.func.inputs[0]?.type ?? '');
    if (firstUint) {
      return {
        operationType: 'fund-withdraw',
        audience: 'user',
        title: 'Withdraw',
        risk: 'medium',
        confidence: 0.5,
        evidence: {
          source: 'signature',
          detail: `${ctx.func.name} withdraws a specified amount - a user action`,
          weight: 0.5,
        },
        priority: 60,
      };
    }
    return {
      operationType: 'fund-withdraw',
      audience: 'admin',
      title: 'Withdraw',
      risk: 'high',
      confidence: 0.5,
      evidence: {
        source: 'signature',
        detail: `${ctx.func.name} takes no amount - looks like a privileged drain`,
        weight: 0.5,
      },
      priority: 60,
    };
  },
};

/* ---------------------------- risk heuristics ---------------------------- */

const DESTRUCTIVE = /(selfdestruct|destroy|\bkill\b|shutdown|drain|rug|nuke)/;
const DANGEROUS = /(withdrawall|emergencywithdraw|migrate|setowner|setadmin|upgrade)/;

/**
 * Raise the risk level for dangerous shapes without changing routing (it never
 * sets a type). Two tiers, because "payable" is not itself dangerous:
 *   - Destructive/dangerous *names* (selfdestruct, upgrade, setAdmin, migrate…)
 *     win at priority 70 — above routing, so they always override a benign risk.
 *   - `payable` only sets a *medium floor* at priority 45 — BELOW the routing
 *     rules (name=50, mint/withdraw=60, standards=100). So an obvious user action
 *     that happens to be payable (a `deposit()`/`stake()`/paid mint) keeps the
 *     low/medium risk its routing rule assigned, while a payable function no rule
 *     understood still gets flagged medium as a safe default. Accepting value is
 *     expected for deposits; it shouldn't inflate their risk.
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
        evidence: {
          source: 'signature',
          detail: `${ctx.func.name} is payable (accepts value); medium unless a routing rule knows better`,
        },
        priority: 45,
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
  mintShapeRule,
  withdrawShapeRule,
  nameHeuristicRule,
  readRule,
  fallbackRule,
];
