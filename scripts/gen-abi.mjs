#!/usr/bin/env node
// Extract compiled ABIs from the Foundry build output into committed JSON
// fixtures that drive the analyzer/classifier unit tests. Run after `forge build`
// in `contracts/fixtures`. Usage: `node scripts/gen-abi.mjs` (or `pnpm gen:abi`).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = join(root, 'contracts', 'fixtures');
const outDir = join(fixtures, 'out');
const abiDir = join(fixtures, 'abi');

const CONTRACTS = ['MockERC20', 'MockVault', 'MockRWA'];

if (!existsSync(outDir)) {
  console.error(`No Foundry output at ${outDir}. Run \`forge build\` in contracts/fixtures first.`);
  process.exit(1);
}

mkdirSync(abiDir, { recursive: true });

for (const name of CONTRACTS) {
  const artifactPath = join(outDir, `${name}.sol`, `${name}.json`);
  if (!existsSync(artifactPath)) {
    console.error(`Missing artifact ${artifactPath}.`);
    process.exit(1);
  }
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
  const abi = artifact.abi;
  if (!Array.isArray(abi)) {
    console.error(`Artifact ${name} has no abi array.`);
    process.exit(1);
  }
  const dest = join(abiDir, `${name}.json`);
  writeFileSync(dest, `${JSON.stringify(abi, null, 2)}\n`);
  console.log(`wrote ${dest} (${abi.length} entries)`);
}
