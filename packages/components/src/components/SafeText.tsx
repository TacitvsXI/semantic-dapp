import { sanitizeText } from '@semantic-dapp/spec';

export interface SafeTextProps {
  value?: string;
  maxLength?: number;
  className?: string;
  /** Shown (sanitized) when `value` is empty. */
  fallback?: string;
}

/**
 * Render an untrusted string safely: strips dangerous characters and, when the
 * input looks spoofed (bidi/zero-width/homoglyph), appends a ⚠ marker explaining
 * why instead of trusting or silently dropping it (ADR-008).
 */
export function SafeText({ value, maxLength, className, fallback }: SafeTextProps) {
  const source = value && value.length > 0 ? value : (fallback ?? '');
  const { text, issues, safe } = sanitizeText(source, maxLength ? { maxLength } : undefined);

  if (safe) return <span className={className}>{text}</span>;

  const title = issues.map((i) => i.detail).join(' ');
  return (
    <span className={className}>
      {text}
      <span className="sd-safe-warn" role="img" aria-label="Suspicious text" title={title}>
        {' '}
        ⚠
      </span>
    </span>
  );
}
