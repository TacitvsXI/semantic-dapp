import { useCallback, useEffect, useRef, useState } from 'react';

export interface CopyButtonProps {
  /** The text to copy to the clipboard. */
  value: string;
  /** Accessible label / tooltip (defaults to "Copy"). */
  label?: string;
  /** Extra class names appended to the button. */
  className?: string;
  /** Optional visible text next to the icon. */
  children?: React.ReactNode;
}

async function writeClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  // Legacy fallback for insecure contexts / older browsers.
  try {
    const el = document.createElement('textarea');
    el.value = value;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/**
 * A tiny copy-to-clipboard button. Shows a transient checkmark on success and
 * is fully keyboard/screen-reader accessible. Presentational and dependency-free.
 */
export function CopyButton({ value, label = 'Copy', className, children }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onClick = useCallback(async () => {
    const ok = await writeClipboard(value);
    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1200);
  }, [value]);

  return (
    <button
      type="button"
      className={`sd-copy${copied ? ' sd-copy--done' : ''}${className ? ` ${className}` : ''}`}
      onClick={() => void onClick()}
      title={copied ? 'Copied' : label}
      aria-label={copied ? 'Copied' : label}
    >
      <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
      {children ? <span className="sd-copy__text">{children}</span> : null}
    </button>
  );
}
