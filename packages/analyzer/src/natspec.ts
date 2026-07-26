/**
 * Lightweight NatSpec + modifier extraction from verified Solidity sources.
 *
 * This is intentionally regex-based, not a full Solidity parser: we only need
 * per-function documentation (`@notice`/`@dev`/`@param`) and the list of applied
 * modifiers (to detect access gating like `onlyOwner`/`onlyRole`). Anything we
 * cannot parse is silently skipped - enrichment is strictly additive and must
 * never break classification (graceful degradation, ADR-001).
 *
 * The output is a plain, JSON-serializable object so callers (e.g. the studio)
 * can persist it alongside a project without keeping the full source in memory.
 */

/** A resolved access-control signal for a function, from modifiers or its body. */
export interface AccessHint {
  kind: 'ownable' | 'access-control' | 'custom';
  /** Role identifier for access-control gating, when known. */
  role?: string;
  /** Human-readable justification, e.g. "restricted to owner". */
  detail: string;
}

/** Parsed documentation for a single function declaration found in source. */
export interface FunctionDoc {
  name: string;
  /** `@notice` (or the untagged leading text, per NatSpec defaults). */
  notice?: string;
  /** `@dev` developer notes. */
  dev?: string;
  /** `@param name -> description`. */
  params?: Record<string, string>;
  /** `@return` text. */
  returns?: string;
  /** Solidity parameter types in declaration order, for overload matching. */
  paramTypes: string[];
  /** Applied modifiers, e.g. `onlyOwner`, `onlyRole(ADMIN_ROLE)`, `nonReentrant`. */
  modifiers: string[];
  /**
   * Resolved access gating, if any - from a privileged modifier (standard or a
   * custom modifier whose body checks the caller) or from a body-level check
   * (`require(msg.sender == ...)`, `_checkRole(...)`, `hasRole(...)`). Only ever a
   * positive signal; absence never implies "public".
   */
  access?: AccessHint;
}

/** Docs keyed by function name (a name may have several overloads). */
export type SourceDocs = Record<string, FunctionDoc[]>;

export interface SourceFile {
  path?: string;
  content: string;
}

/** Solidity keywords that appear between `)` and `{` but are not modifiers. */
const NON_MODIFIER_KEYWORDS = new Set([
  'public',
  'external',
  'internal',
  'private',
  'view',
  'pure',
  'payable',
  'nonpayable',
  'virtual',
  'override',
  'returns',
]);

const MAX_TEXT = 400;

/**
 * Matches an optional doc comment immediately followed by a function declaration.
 * Captures the doc block, the function name, its raw parameters, and the tail
 * (visibility + modifiers + returns) up to the opening brace or semicolon.
 */
const FUNCTION_RE =
  /(?<doc>(?:[ \t]*\/\/\/[^\n]*\r?\n)+|[ \t]*\/\*\*[\s\S]*?\*\/[ \t\r\n]*)?[ \t]*function\s+(?<name>[A-Za-z_]\w*)\s*\((?<params>[\s\S]*?)\)(?<tail>[^{;]*)(?<end>[{;])/g;

function clamp(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length > MAX_TEXT ? `${trimmed.slice(0, MAX_TEXT - 1)}…` : trimmed;
}

/** Strip comment markers (`///`, `/** *``/`, leading `*`) from a doc block. */
function cleanDocLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*\/\/\/ ?/, '')
        .replace(/^\s*\/\*\*/, '')
        .replace(/\*\/\s*$/, '')
        .replace(/^\s*\* ?/, '')
        .trimEnd(),
    )
    .map((line) => line.trim())
    .filter((line, i, arr) => line.length > 0 || (i > 0 && i < arr.length - 1));
}

interface ParsedDoc {
  notice?: string;
  dev?: string;
  params?: Record<string, string>;
  returns?: string;
}

/** Parse a cleaned NatSpec doc block into structured tags. */
function parseDocBlock(raw: string | undefined): ParsedDoc {
  if (!raw) return {};
  const lines = cleanDocLines(raw);
  const notice: string[] = [];
  const dev: string[] = [];
  const params: Record<string, string> = {};
  const returns: string[] = [];
  // Untagged leading text is the notice, per NatSpec convention.
  let current: { kind: 'notice' | 'dev' | 'return' } | { kind: 'param'; name: string } = {
    kind: 'notice',
  };

  for (const line of lines) {
    const tag = /^@(\w+)\s*(.*)$/.exec(line);
    if (tag) {
      const [, name, rest] = tag;
      const body = rest ?? '';
      switch (name) {
        case 'notice':
          current = { kind: 'notice' };
          if (body) notice.push(body);
          break;
        case 'dev':
          current = { kind: 'dev' };
          if (body) dev.push(body);
          break;
        case 'return':
          current = { kind: 'return' };
          if (body) returns.push(body);
          break;
        case 'param': {
          const m = /^(\w+)\s+([\s\S]*)$/.exec(body);
          if (m?.[1]) {
            current = { kind: 'param', name: m[1] };
            params[m[1]] = m[2] ?? '';
          } else {
            current = { kind: 'notice' };
          }
          break;
        }
        default:
          // Unknown tag (@inheritdoc, @custom:*): stop appending to prior tag.
          current = { kind: 'dev' };
          break;
      }
      continue;
    }
    // Continuation line: append to whatever tag we're inside.
    if (current.kind === 'notice') notice.push(line);
    else if (current.kind === 'dev') dev.push(line);
    else if (current.kind === 'return') returns.push(line);
    else if (current.kind === 'param')
      params[current.name] = `${params[current.name] ?? ''} ${line}`.trim();
  }

  const doc: ParsedDoc = {};
  if (notice.length) doc.notice = clamp(notice.join(' '));
  if (dev.length) doc.dev = clamp(dev.join(' '));
  if (returns.length) doc.returns = clamp(returns.join(' '));
  const paramKeys = Object.keys(params);
  if (paramKeys.length) {
    doc.params = {};
    for (const key of paramKeys) doc.params[key] = clamp(params[key] ?? '');
  }
  return doc;
}

/** Extract the leading Solidity type token from each comma-separated parameter. */
function parseParamTypes(rawParams: string): string[] {
  const trimmed = rawParams.trim();
  if (!trimmed) return [];
  return trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.split(/\s+/)[0] ?? '');
}

/** Extract applied modifiers from the `)` … `{` tail of a declaration. */
function parseModifiers(tail: string): string[] {
  const withoutReturns = tail
    .replace(/returns\s*\([^)]*\)/g, ' ')
    .replace(/override\s*\([^)]*\)/g, ' override ');
  const tokens = withoutReturns.match(/[A-Za-z_]\w*(?:\s*\([^)]*\))?/g) ?? [];
  const modifiers: string[] = [];
  for (const token of tokens) {
    const bare = token.replace(/\s+/g, '');
    const name = bare.replace(/\(.*$/, '');
    if (NON_MODIFIER_KEYWORDS.has(name)) continue;
    modifiers.push(bare);
  }
  return modifiers;
}

/** Return the body of a `{ … }` block given the index of its opening brace. */
function extractBody(content: string, openBraceIndex: number, maxLen = 8000): string {
  if (content[openBraceIndex] !== '{') return '';
  let depth = 0;
  const end = Math.min(content.length, openBraceIndex + maxLen);
  for (let i = openBraceIndex; i < end; i++) {
    const ch = content[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return content.slice(openBraceIndex + 1, i);
    }
  }
  return content.slice(openBraceIndex + 1, end);
}

const MODIFIER_DEF_RE = /\bmodifier\s+([A-Za-z_]\w*)\s*(?:\([^)]*\))?\s*\{/g;

/**
 * Detect a caller-restricting access check inside a block of Solidity code
 * (a modifier body or a function body). Ordered most-specific first.
 */
function detectAccessInCode(code: string): AccessHint | undefined {
  if (!code) return undefined;

  // Role-based (OpenZeppelin AccessControl and look-alikes).
  const checkRole = /_checkRole\s*\(\s*([A-Za-z_]\w*)/.exec(code);
  if (checkRole)
    return { kind: 'access-control', role: checkRole[1], detail: `requires role ${checkRole[1]}` };
  const hasRole = /hasRole\s*\(\s*([A-Za-z_]\w*)\s*,\s*(?:_?msgSender\(\)|msg\.sender)\s*\)/.exec(
    code,
  );
  if (hasRole)
    return { kind: 'access-control', role: hasRole[1], detail: `requires role ${hasRole[1]}` };
  const inlineRole = /onlyRole\s*\(\s*([A-Za-z_]\w*)\s*\)/.exec(code);
  if (inlineRole)
    return {
      kind: 'access-control',
      role: inlineRole[1],
      detail: `requires role ${inlineRole[1]}`,
    };

  // Owner-based.
  if (/_checkOwner\s*\(/.test(code)) return { kind: 'ownable', detail: 'restricted to owner' };
  if (
    /(?:_?msgSender\(\)|msg\.sender)\s*==\s*owner\s*\(\s*\)/.test(code) ||
    /owner\s*\(\s*\)\s*==\s*(?:_?msgSender\(\)|msg\.sender)/.test(code) ||
    /(?:_?msgSender\(\)|msg\.sender)\s*==\s*_owner\b/.test(code)
  ) {
    return { kind: 'ownable', detail: 'restricted to owner' };
  }

  // Generic single-authority checks (admin/governance/wards/...).
  const eq =
    /(?:require|if)\s*\(\s*(?:_?msgSender\(\)|msg\.sender)\s*(==|!=)\s*([A-Za-z_][\w.]*(?:\(\))?)/.exec(
      code,
    );
  if (eq && !/^owner/i.test(eq[2] ?? '')) {
    return { kind: 'custom', detail: `restricted to ${eq[2]}` };
  }
  if (/wards\s*\[\s*msg\.sender\s*\]/.test(code)) {
    return { kind: 'custom', detail: 'restricted to authorized wards' };
  }
  return undefined;
}

/** Collect custom modifiers whose *definition* restricts the caller. */
function collectPrivilegedModifiers(files: SourceFile[]): Map<string, AccessHint> {
  const map = new Map<string, AccessHint>();
  for (const file of files) {
    const content = file.content;
    MODIFIER_DEF_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MODIFIER_DEF_RE.exec(content)) !== null) {
      const name = m[1];
      if (!name || map.has(name)) continue;
      const body = extractBody(content, MODIFIER_DEF_RE.lastIndex - 1, 2000);
      const access = detectAccessInCode(body);
      if (access) map.set(name, access);
    }
  }
  return map;
}

/** Resolve access gating for a function from its modifiers, then its body. */
function resolveAccess(
  modifiers: string[],
  body: string,
  privilegedCustom: Map<string, AccessHint>,
): AccessHint | undefined {
  for (const modifier of modifiers) {
    const std = privilegeFromModifiers([modifier]);
    if (std) {
      if (std.role)
        return { kind: 'access-control', role: std.role, detail: `gated by onlyRole(${std.role})` };
      if (std.ownable) return { kind: 'ownable', detail: `gated by ${std.modifier}` };
      return { kind: 'custom', detail: `gated by ${std.modifier}` };
    }
    const bare = modifier.replace(/\(.*$/, '');
    const custom = privilegedCustom.get(bare);
    if (custom) return { ...custom, detail: `gated by ${bare} (${custom.detail})` };
  }
  return detectAccessInCode(body);
}

/**
 * Parse NatSpec docs, modifiers and access gating for every function declaration
 * across the given source files. Returns an empty object when there's nothing to
 * parse.
 */
export function parseNatSpec(sources: SourceFile[] | undefined): SourceDocs {
  // Keyed by arbitrary function names, so use a null-prototype object to avoid
  // collisions with Object.prototype members (e.g. a `toString`/`constructor`
  // function in the contract).
  const docs: SourceDocs = Object.create(null) as SourceDocs;
  if (!sources?.length) return docs;

  const files = sources.filter(
    (f): f is SourceFile => !!f?.content && f.content.length <= 2_000_000,
  );
  const privilegedCustom = collectPrivilegedModifiers(files);

  for (const file of files) {
    const content = file.content;
    FUNCTION_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = FUNCTION_RE.exec(content)) !== null) {
      const groups = match.groups;
      if (!groups?.name) continue;
      const parsed = parseDocBlock(groups.doc);
      const paramTypes = parseParamTypes(groups.params ?? '');
      const modifiers = parseModifiers(groups.tail ?? '');
      const body = groups.end === '{' ? extractBody(content, FUNCTION_RE.lastIndex - 1) : '';
      const access = resolveAccess(modifiers, body, privilegedCustom);
      // Nothing useful for this declaration - don't record noise.
      if (!parsed.notice && !parsed.dev && !parsed.params && modifiers.length === 0 && !access) {
        continue;
      }

      const doc: FunctionDoc = { name: groups.name, paramTypes, modifiers };
      if (parsed.notice) doc.notice = parsed.notice;
      if (parsed.dev) doc.dev = parsed.dev;
      if (parsed.returns) doc.returns = parsed.returns;
      if (parsed.params) doc.params = parsed.params;
      if (access) doc.access = access;

      (docs[groups.name] ??= []).push(doc);
    }
  }
  return docs;
}

/** Admin-ish modifier names (besides `onlyRole(...)`) that imply privilege. */
const PRIVILEGED_MODIFIER =
  /^only(owner|admin|governance|governor|gov|minter|burner|operator|manager|controller|dao|timelock|guardian|keeper|authorized|auth|multisig|team|deployer)$|^(requiresauth|restricted|auth|authorized)$/i;

export interface PrivilegeHint {
  /** The modifier that implied privilege, e.g. `onlyOwner`. */
  modifier: string;
  /** Role identifier captured from `onlyRole(ROLE)`, when present. */
  role?: string;
  /** True for the classic single-owner pattern. */
  ownable: boolean;
}

/**
 * Given a function's modifiers, return a privilege hint if any modifier gates
 * access to privileged callers. Only recognises an explicit allowlist (plus
 * `onlyRole(...)`) so guard modifiers like `nonReentrant`/`whenNotPaused` never
 * masquerade as access control.
 */
export function privilegeFromModifiers(modifiers: string[] | undefined): PrivilegeHint | undefined {
  if (!modifiers?.length) return undefined;
  for (const modifier of modifiers) {
    const roleCall = /^onlyRole\(\s*([A-Za-z_]\w*)\s*\)$/i.exec(modifier);
    if (roleCall) {
      return { modifier, role: roleCall[1], ownable: false };
    }
    const bare = modifier.replace(/\(.*$/, '');
    if (PRIVILEGED_MODIFIER.test(bare)) {
      return { modifier: bare, ownable: /owner/i.test(bare) };
    }
  }
  return undefined;
}

/**
 * Pick the {@link FunctionDoc} that best matches a function signature among a
 * name's overloads: same arity first, then a loose type comparison, else the
 * sole candidate.
 */
export function matchDoc(
  candidates: FunctionDoc[] | undefined,
  argTypes: string[],
): FunctionDoc | undefined {
  if (!candidates?.length) return undefined;
  if (candidates.length === 1) return candidates[0];

  const sameArity = candidates.filter((c) => c.paramTypes.length === argTypes.length);
  if (sameArity.length === 1) return sameArity[0];

  const pool = sameArity.length > 0 ? sameArity : candidates;
  let best: FunctionDoc | undefined;
  let bestScore = -1;
  for (const candidate of pool) {
    let score = 0;
    for (let i = 0; i < argTypes.length; i++) {
      if (looseTypeEq(candidate.paramTypes[i], argTypes[i])) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best ?? pool[0];
}

/** Compare a source-declared type to an ABI type, tolerating aliases. */
function looseTypeEq(sourceType: string | undefined, abiType: string | undefined): boolean {
  if (!sourceType || !abiType) return false;
  const s = sourceType.replace(/\s+/g, '');
  if (s === abiType) return true;
  if (s === 'uint' && abiType === 'uint256') return true;
  if (s === 'int' && abiType === 'int256') return true;
  // Non-elementary source types (interfaces/contracts) become `address` in the ABI.
  if (abiType === 'address' && /^[A-Z]/.test(s)) return true;
  return false;
}
