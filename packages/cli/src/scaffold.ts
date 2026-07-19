import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBundle, type SemanticBundle } from '@semantic-dapp/export';

const SKIP = new Set(['node_modules', 'dist', '.turbo', 'test-results', 'playwright-report']);

/** Best-effort default location of the bundled generated-app template. */
export function defaultTemplateDir(): string {
  // dist/scaffold.js → packages/cli → repo root → apps/generated-app
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..', '..', 'apps', 'generated-app');
}

export interface ExportOptions {
  bundle: SemanticBundle;
  outDir: string;
  templateDir?: string;
}

/**
 * Scaffold a standalone app: copy the template (minus build artifacts) into
 * `outDir` and inject the bundle as `public/bundle.json`. The exported app reads
 * that file at runtime (ADR-009).
 */
export function exportApp(options: ExportOptions): { outDir: string; bundlePath: string } {
  const templateDir = options.templateDir ?? defaultTemplateDir();
  if (!existsSync(templateDir)) {
    throw new Error(`Template not found at ${templateDir}. Pass --template <dir>.`);
  }

  mkdirSync(options.outDir, { recursive: true });
  cpSync(templateDir, options.outDir, {
    recursive: true,
    filter: (src) => !src.split(/[\\/]/).some((part) => SKIP.has(part)),
  });

  const publicDir = join(options.outDir, 'public');
  mkdirSync(publicDir, { recursive: true });
  const bundlePath = join(publicDir, 'bundle.json');
  writeFileSync(bundlePath, `${JSON.stringify(options.bundle, null, 2)}\n`);

  renamePackage(join(options.outDir, 'package.json'), options.bundle.name);

  return { outDir: options.outDir, bundlePath };
}

function renamePackage(pkgPath: string, appName: string): void {
  if (!existsSync(pkgPath)) return;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
    const slug = appName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    pkg.name = slug || 'semantic-dapp-app';
    pkg.private = true;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  } catch {
    /* leave the template package.json untouched on parse failure */
  }
}

/** Read + parse a bundle JSON file, throwing a readable error on failure. */
export function readBundleFile(path: string): SemanticBundle {
  const json: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const result = parseBundle(json);
  if (!result.ok || !result.bundle) {
    throw new Error(`Invalid bundle at ${path}: ${result.error ?? 'unknown error'}`);
  }
  return result.bundle;
}
