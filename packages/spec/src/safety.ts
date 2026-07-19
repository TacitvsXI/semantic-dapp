import type { RiskLevel } from './manifest.js';

/** A category of problem found while sanitizing untrusted text. */
export type TextIssueKind = 'control' | 'bidi' | 'zero-width' | 'mixed-script' | 'too-long';

export interface TextIssue {
  kind: TextIssueKind;
  detail: string;
}

export interface SanitizedText {
  /** Cleaned, display-safe text. */
  text: string;
  issues: TextIssue[];
  /** True when no issues were found. */
  safe: boolean;
}

// C0/C1 control characters (incl. tab/newline — untrusted labels are single-line).
// eslint-disable-next-line no-control-regex -- deliberately matching control chars to strip them
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g;
// Bidirectional overrides/isolates that can visually reorder text.
const BIDI = /[\u202A-\u202E\u2066-\u2069]/g;
// Zero-width and BOM characters that hide content or split words.
const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;

const LATIN = /[A-Za-z]/;
const CYRILLIC = /[\u0400-\u04FF]/;
const GREEK = /[\u0370-\u03FF]/;

const DEFAULT_MAX_LENGTH = 200;

/**
 * Make an untrusted string safe to display and report why. Strips control,
 * bidi-override and zero-width characters, flags mixed-script (homoglyph) spoofs
 * and over-length input, and truncates. Deterministic; never throws.
 */
export function sanitizeText(input: unknown, opts?: { maxLength?: number }): SanitizedText {
  const maxLength = opts?.maxLength ?? DEFAULT_MAX_LENGTH;
  const issues: TextIssue[] = [];

  if (typeof input !== 'string') {
    return { text: '', issues, safe: true };
  }

  let text = input;

  if (BIDI.test(text)) {
    issues.push({ kind: 'bidi', detail: 'Contains bidirectional override characters.' });
    text = text.replace(BIDI, '');
  }
  if (ZERO_WIDTH.test(text)) {
    issues.push({ kind: 'zero-width', detail: 'Contains zero-width/invisible characters.' });
    text = text.replace(ZERO_WIDTH, '');
  }
  if (CONTROL.test(text)) {
    issues.push({ kind: 'control', detail: 'Contains control characters.' });
    text = text.replace(CONTROL, '');
  }

  const hasLatin = LATIN.test(text);
  if (hasLatin && (CYRILLIC.test(text) || GREEK.test(text))) {
    issues.push({
      kind: 'mixed-script',
      detail: 'Mixes Latin with Cyrillic/Greek letters (possible homoglyph spoof).',
    });
  }

  if (text.length > maxLength) {
    issues.push({ kind: 'too-long', detail: `Longer than ${maxLength} characters; truncated.` });
    text = `${text.slice(0, maxLength)}…`;
  }

  return { text, issues, safe: issues.length === 0 };
}

/** How serious a preflight safety warning is. */
export type SafetySeverity = 'info' | 'warn' | 'danger';

export interface SafetyWarning {
  severity: SafetySeverity;
  title: string;
  detail: string;
}

export interface WriteSafetyContext {
  /** Chain the connected wallet is on. */
  walletChainId?: number;
  /** Chain the contract/project targets. */
  contractChainId?: number;
  /** Whether the ABI/source is verified (provenance). */
  verified?: boolean;
  /** Whether the manifest is stale vs the deployed implementation. */
  stale?: boolean;
  /** Risk of the operation being sent. */
  risk?: RiskLevel;
}

/**
 * Compute preflight warnings for a write, in decreasing severity. Pure: callers
 * decide how to surface them (e.g. in the confirmation modal).
 */
export function writeWarnings(ctx: WriteSafetyContext): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];

  if (
    ctx.walletChainId !== undefined &&
    ctx.contractChainId !== undefined &&
    ctx.walletChainId !== ctx.contractChainId
  ) {
    warnings.push({
      severity: 'danger',
      title: 'Wrong network',
      detail: `Wallet is on chain ${ctx.walletChainId}, but this contract is on chain ${ctx.contractChainId}.`,
    });
  }

  if (ctx.stale) {
    warnings.push({
      severity: 'warn',
      title: 'Possibly stale',
      detail:
        'The deployed implementation differs from the analyzed one; behavior may have changed.',
    });
  }

  if (ctx.verified === false) {
    warnings.push({
      severity: 'warn',
      title: 'Unverified source',
      detail: 'This ABI was not verified against published source. Proceed with extra caution.',
    });
  }

  if (ctx.risk === 'critical') {
    warnings.push({
      severity: 'danger',
      title: 'Critical action',
      detail: 'This action is high-impact and may be irreversible.',
    });
  }

  return warnings;
}
