import type { SafetyWarning } from '@semantic-dapp/spec';

/** Render preflight safety warnings, most severe first. */
export function SafetyWarnings({ warnings }: { warnings: SafetyWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul className="sd-warnings" data-testid="safety-warnings">
      {warnings.map((w, index) => (
        <li key={index} className={`sd-warning sd-warning--${w.severity}`}>
          <strong className="sd-warning__title">{w.title}</strong>
          <span className="sd-warning__detail">{w.detail}</span>
        </li>
      ))}
    </ul>
  );
}
