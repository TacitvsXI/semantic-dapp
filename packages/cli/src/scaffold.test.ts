import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseBundle } from '@semantic-dapp/export';
import { bundleFromInputs } from './bundle.js';
import { exportApp, readBundleFile } from './scaffold.js';

const ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

const dirs: string[] = [];
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), 'sd-cli-'));
  dirs.push(d);
  return d;
}

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function demoBundle() {
  return bundleFromInputs({ abi: ABI as never, name: 'Demo', chainId: 1 });
}

describe('readBundleFile', () => {
  it('reads and validates a bundle file', () => {
    const dir = tmp();
    const path = join(dir, 'demo.bundle.json');
    writeFileSync(path, JSON.stringify(demoBundle()));
    expect(readBundleFile(path).name).toBe('Demo');
  });

  it('throws on an invalid bundle', () => {
    const dir = tmp();
    const path = join(dir, 'bad.json');
    writeFileSync(path, JSON.stringify({ bundleVersion: 1 }));
    expect(() => readBundleFile(path)).toThrow();
  });
});

describe('exportApp', () => {
  it('copies a template and injects bundle.json', () => {
    // Minimal fake template with a package.json.
    const template = tmp();
    writeFileSync(join(template, 'package.json'), JSON.stringify({ name: 'tpl', version: '0' }));
    writeFileSync(join(template, 'index.html'), '<!doctype html>');
    mkdirSync(join(template, 'node_modules'));
    writeFileSync(join(template, 'node_modules', 'ignored.txt'), 'x');

    const out = join(tmp(), 'app');
    const result = exportApp({ bundle: demoBundle(), outDir: out, templateDir: template });

    expect(existsSync(result.bundlePath)).toBe(true);
    const parsed = parseBundle(JSON.parse(readFileSync(result.bundlePath, 'utf8')));
    expect(parsed.ok).toBe(true);

    // node_modules is not copied.
    expect(existsSync(join(out, 'node_modules'))).toBe(false);

    // package.json is renamed to a slug of the app name.
    const pkg = JSON.parse(readFileSync(join(out, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('demo');
  });
});
