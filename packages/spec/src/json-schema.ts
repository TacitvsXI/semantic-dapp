import { zodToJsonSchema } from 'zod-to-json-schema';
import { semanticManifestSchema } from './manifest.js';

/**
 * Produce the public JSON Schema for the semantic manifest. Used for editor
 * validation, documentation and external tooling.
 */
export function manifestJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(semanticManifestSchema, {
    name: 'SemanticManifest',
    $refStrategy: 'root',
  }) as Record<string, unknown>;
}
