// Build the committed demo bundles from the real fixture ABIs. Each bundle is a
// portable SemanticBundle the standalone template can render as `bundle.json`.
// Run with: pnpm gen:demos (requires `pnpm build` + `pnpm gen:abi` first).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAbi } from '@semantic-dapp/spec';
import { buildManifest } from '@semantic-dapp/classifier';
import { buildBundle } from '@semantic-dapp/export';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const abiDir = join(root, 'contracts', 'fixtures', 'abi');
const outDir = join(root, 'docs', 'demo', 'bundles');
mkdirSync(outDir, { recursive: true });

const GENERATED_AT = '2026-01-01T00:00:00.000Z';
const RPC = 'http://127.0.0.1:8545';

const DEMOS = [
  { file: 'erc20', artifact: 'MockERC20', name: 'Demo Token', contractName: 'MockERC20' },
  { file: 'vault', artifact: 'MockVault', name: 'Demo Vault', contractName: 'MockVault' },
  { file: 'rwa', artifact: 'MockRWA', name: 'Demo RWA', contractName: 'MockRWA' },
];

for (const demo of DEMOS) {
  const abi = JSON.parse(readFileSync(join(abiDir, `${demo.artifact}.json`), 'utf8'));
  const model = normalizeAbi(abi);
  const manifest = buildManifest(model, {
    projectName: demo.name,
    contractId: 'contract',
    chainId: 31337,
    contractName: demo.contractName,
    abiSource: 'manual',
  });
  const bundle = buildBundle({
    name: demo.name,
    chainId: 31337,
    contractName: demo.contractName,
    rpcUrl: RPC,
    abi,
    manifest,
    generatedAt: GENERATED_AT,
  });
  const dest = join(outDir, `${demo.file}.bundle.json`);
  writeFileSync(dest, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(`wrote ${dest} (${manifest.operations.length} operations, standards: ${bundle.manifest.contracts[0].standards.join(', ')})`);
}
