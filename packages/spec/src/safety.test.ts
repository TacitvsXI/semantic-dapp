import { describe, it, expect } from 'vitest';
import { sanitizeText, writeWarnings } from './safety.js';

describe('sanitizeText', () => {
  it('passes clean text through unchanged', () => {
    const result = sanitizeText('Wrapped Ether');
    expect(result.safe).toBe(true);
    expect(result.text).toBe('Wrapped Ether');
    expect(result.issues).toHaveLength(0);
  });

  it('strips bidi override characters and flags them', () => {
    const result = sanitizeText('good\u202Eevil');
    expect(result.text).toBe('goodevil');
    expect(result.issues.map((i) => i.kind)).toContain('bidi');
    expect(result.safe).toBe(false);
  });

  it('strips zero-width characters', () => {
    const result = sanitizeText('US\u200BDC');
    expect(result.text).toBe('USDC');
    expect(result.issues.map((i) => i.kind)).toContain('zero-width');
  });

  it('strips control characters', () => {
    const result = sanitizeText('a\u0007b');
    expect(result.text).toBe('ab');
    expect(result.issues.map((i) => i.kind)).toContain('control');
  });

  it('flags mixed Latin/Cyrillic homoglyphs', () => {
    // "Ethеr" with a Cyrillic 'е'.
    const result = sanitizeText('Eth\u0435r');
    expect(result.issues.map((i) => i.kind)).toContain('mixed-script');
  });

  it('truncates over-long input', () => {
    const result = sanitizeText('x'.repeat(300), { maxLength: 10 });
    expect(result.text.length).toBe(11); // 10 + ellipsis
    expect(result.issues.map((i) => i.kind)).toContain('too-long');
  });

  it('handles non-strings', () => {
    expect(sanitizeText(undefined).text).toBe('');
    expect(sanitizeText(42).safe).toBe(true);
  });
});

describe('writeWarnings', () => {
  it('flags a wrong-network write as danger', () => {
    const warnings = writeWarnings({ walletChainId: 1, contractChainId: 137 });
    expect(warnings[0]?.severity).toBe('danger');
    expect(warnings[0]?.title).toBe('Wrong network');
  });

  it('warns about unverified and stale sources', () => {
    const warnings = writeWarnings({ verified: false, stale: true });
    const titles = warnings.map((w) => w.title);
    expect(titles).toContain('Unverified source');
    expect(titles).toContain('Possibly stale');
  });

  it('flags critical risk', () => {
    const warnings = writeWarnings({ risk: 'critical' });
    expect(warnings.some((w) => w.title === 'Critical action' && w.severity === 'danger')).toBe(
      true,
    );
  });

  it('returns nothing when all is well', () => {
    expect(writeWarnings({ walletChainId: 1, contractChainId: 1, verified: true })).toHaveLength(0);
  });
});
