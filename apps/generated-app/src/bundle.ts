import { parseBundle, type SemanticBundle } from '@semantic-dapp/export';
import demoJson from './demo-bundle.json';

export interface LoadedBundle {
  bundle: SemanticBundle;
  /** True when the committed demo bundle was used (no injected bundle found). */
  isDemo: boolean;
}

function demoBundle(): SemanticBundle {
  const result = parseBundle(demoJson);
  if (!result.ok || !result.bundle) {
    throw new Error(`Bundled demo is invalid: ${result.error ?? 'unknown error'}`);
  }
  return result.bundle;
}

/**
 * Load the app's bundle. An exported app ships a `bundle.json` next to
 * `index.html`; if it is missing or invalid we fall back to the committed demo so
 * the template always renders something (ADR-009).
 */
export async function loadBundle(): Promise<LoadedBundle> {
  const url = `${import.meta.env.BASE_URL}bundle.json`;
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return { bundle: demoBundle(), isDemo: true };
    const json: unknown = await response.json();
    const result = parseBundle(json);
    if (result.ok && result.bundle) return { bundle: result.bundle, isDemo: false };
    return { bundle: demoBundle(), isDemo: true };
  } catch {
    return { bundle: demoBundle(), isDemo: true };
  }
}
