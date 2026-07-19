import { safeParseManifest, type SemanticManifest } from './manifest.js';

/** The manifest schema version this build produces and validates against. */
export const CURRENT_MANIFEST_VERSION = 1;

/** A pure data transform upgrading a raw manifest from version N to N+1. */
export type ManifestMigration = (input: Record<string, unknown>) => Record<string, unknown>;

/**
 * Ordered migrations keyed by their *source* version. To add v2, set
 * `CURRENT_MANIFEST_VERSION = 2` and register `MIGRATIONS[1] = (m) => ({...})`.
 */
const MIGRATIONS: Record<number, ManifestMigration> = {};

export interface MigrateResult {
  ok: boolean;
  manifest?: SemanticManifest;
  error?: string;
  fromVersion?: number;
  toVersion: number;
}

/**
 * Upgrade an unknown/older manifest to the current schema version and validate
 * it. Applies registered migrations step-by-step, then runs the Zod schema.
 * Manifests newer than the supported version are rejected.
 */
export function migrateManifest(input: unknown): MigrateResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      error: 'Manifest must be a JSON object',
      toVersion: CURRENT_MANIFEST_VERSION,
    };
  }

  let obj = { ...(input as Record<string, unknown>) };
  const fromVersion = typeof obj.version === 'number' ? obj.version : 1;

  if (fromVersion > CURRENT_MANIFEST_VERSION) {
    return {
      ok: false,
      error: `Manifest version ${fromVersion} is newer than supported ${CURRENT_MANIFEST_VERSION}. Update the app.`,
      fromVersion,
      toVersion: CURRENT_MANIFEST_VERSION,
    };
  }

  let version = fromVersion;
  while (version < CURRENT_MANIFEST_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) {
      return {
        ok: false,
        error: `No migration registered from manifest version ${version}`,
        fromVersion,
        toVersion: CURRENT_MANIFEST_VERSION,
      };
    }
    obj = migrate(obj);
    version += 1;
  }

  // Ensure the (possibly version-less) object carries the current version.
  obj.version = CURRENT_MANIFEST_VERSION;

  const parsed = safeParseManifest(obj);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    return { ok: false, error: detail, fromVersion, toVersion: CURRENT_MANIFEST_VERSION };
  }

  return { ok: true, manifest: parsed.data, fromVersion, toVersion: CURRENT_MANIFEST_VERSION };
}
