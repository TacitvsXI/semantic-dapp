import type { WritePreview } from '@semantic-dapp/execution';
import { CopyButton } from '@semantic-dapp/components';

/** Shorten a hex string for display, keeping head and tail. */
function shortenHex(hex: string, head = 10, tail = 8): string {
  return hex.length > head + tail + 1 ? `${hex.slice(0, head)}…${hex.slice(-tail)}` : hex;
}

export interface WritePreviewViewProps {
  preview: WritePreview;
  /** Human-readable, decoded argument summary (from the manifest inputs). */
  argSummary?: string[];
}

/**
 * A read-only preview of exactly what a write will send, plus the result of an
 * `eth_call` dry-run (would it revert?). The "don't trust the frontend" panel:
 * users can verify the target, calldata and outcome before signing anything.
 */
export function WritePreviewView({ preview, argSummary }: WritePreviewViewProps) {
  return (
    <div
      className={`sd-preview ${preview.success ? 'sd-preview--ok' : 'sd-preview--fail'}`}
      role="status"
    >
      <div className="sd-preview__head">
        {preview.success ? '✓ Simulation passed — this call would succeed' : '✗ Would revert'}
      </div>

      {!preview.success && preview.error ? (
        <p className="sd-preview__error">
          <strong>{preview.error.title}:</strong> {preview.error.detail}
        </p>
      ) : null}

      <dl className="sd-preview__grid">
        <dt>To</dt>
        <dd>
          <code>{preview.to}</code>
        </dd>

        <dt>Function</dt>
        <dd>
          <code>{preview.functionName}</code>
        </dd>

        {argSummary && argSummary.length > 0 ? (
          <>
            <dt>Arguments</dt>
            <dd>
              <ul className="sd-preview__args">
                {argSummary.map((a, i) => (
                  <li key={i}>
                    <code>{a}</code>
                  </li>
                ))}
              </ul>
            </dd>
          </>
        ) : null}

        {preview.value !== undefined && preview.value > 0n ? (
          <>
            <dt>Value</dt>
            <dd>
              <code>{preview.value.toString()} wei</code>
            </dd>
          </>
        ) : null}

        {preview.gasEstimate !== undefined ? (
          <>
            <dt>Gas (est.)</dt>
            <dd>
              <code>{preview.gasEstimate.toString()}</code>
            </dd>
          </>
        ) : null}

        <dt>Calldata</dt>
        <dd className="sd-preview__calldata">
          <code title={preview.calldata}>{shortenHex(preview.calldata)}</code>
          <CopyButton value={preview.calldata} label="Copy calldata" />
        </dd>
      </dl>
    </div>
  );
}
