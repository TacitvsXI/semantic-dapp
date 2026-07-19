// Build the live GitHub Pages demo bundle. Unlike the local fixture demos, this
// points at a real, well-known mainnet ERC-20 (USDC) over a public, CORS-enabled
// RPC so the hosted demo performs real on-chain reads (name/symbol/decimals/
// totalSupply/balanceOf) with no local node. Writes still require a wallet.
//
// The ABI is the standard ERC-20 fixture ABI, which matches USDC's read surface.
// Run with: pnpm gen:pages (requires `pnpm build` first).
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
const RPC = 'https://ethereum-rpc.publicnode.com';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const abi = JSON.parse(readFileSync(join(abiDir, 'MockERC20.json'), 'utf8'));
const model = normalizeAbi(abi);
const manifest = buildManifest(model, {
  projectName: 'USD Coin (live demo)',
  contractId: 'contract',
  chainId: 1,
  contractName: 'USDC',
  abiSource: 'manual',
});
const bundle = buildBundle({
  name: 'USD Coin (live demo)',
  chainId: 1,
  address: USDC,
  contractName: 'USDC',
  rpcUrl: RPC,
  abi,
  manifest,
  generatedAt: GENERATED_AT,
});
const dest = join(outDir, 'pages.bundle.json');
writeFileSync(dest, `${JSON.stringify(bundle, null, 2)}\n`);
console.log(`wrote ${dest} — ${manifest.operations.length} operations against ${USDC}`);
