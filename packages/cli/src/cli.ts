#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs, type ParsedArgs } from './args.js';
import { abiFromJson, bundleFromInputs } from './bundle.js';
import { bundleFilename } from '@semantic-dapp/export';
import { exportApp, readBundleFile } from './scaffold.js';
import { serve } from './serve.js';

const VERSION = '0.1.0-beta';

const HELP = `semantic-dapp ${VERSION}

Generate a standalone dApp from a contract ABI.

Usage:
  semantic-dapp bundle --abi <file> --name <name> --chain <id> [options]
  semantic-dapp export --bundle <file> --out <dir> [--template <dir>]
  semantic-dapp serve  --dir <dir> [--port <n>]

Commands:
  bundle, import   Analyze an ABI file and write a *.bundle.json
  export           Scaffold a standalone app from a bundle (injects bundle.json)
  serve            Static-serve a built/exported directory (SPA fallback)

bundle options:
  --abi <file>            ABI array or Foundry/Hardhat artifact (required)
  --name <name>           App name (required)
  --chain <id>            Chain id (required)
  --address <0x..>        Contract address
  --rpc <url>             RPC URL baked into the bundle
  --contract-name <name>  On-chain contract name
  --explorer <url>        Block explorer base URL
  --out <file>            Output path (default: <name>.bundle.json)

Global:
  -h, --help       Show this help
  -v, --version    Show version
`;

function fail(message: string): never {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function required(args: ParsedArgs, key: string): string {
  const value = args.flags[key];
  if (value === undefined) fail(`missing required --${key}`);
  return value;
}

function runBundle(args: ParsedArgs): void {
  const abiPath = required(args, 'abi');
  const name = required(args, 'name');
  const chain = Number(required(args, 'chain'));
  if (!Number.isInteger(chain) || chain <= 0) fail('--chain must be a positive integer');

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(abiPath, 'utf8'));
  } catch (e) {
    fail(`could not read ABI at ${abiPath}: ${(e as Error).message}`);
  }

  const abi = abiFromJson(parsed);
  const bundle = bundleFromInputs({
    abi,
    name,
    chainId: chain,
    ...(args.flags.address ? { address: args.flags.address } : {}),
    ...(args.flags.rpc ? { rpcUrl: args.flags.rpc } : {}),
    ...(args.flags['contract-name'] ? { contractName: args.flags['contract-name'] } : {}),
    ...(args.flags.explorer ? { explorerUrl: args.flags.explorer } : {}),
  });

  const out = args.flags.out ?? bundleFilename(name);
  writeFileSync(out, `${JSON.stringify(bundle, null, 2)}\n`);
  process.stdout.write(
    `Wrote ${out} (${bundle.manifest.operations.length} operations, standards: ${
      bundle.manifest.contracts[0]?.standards.join(', ') || 'none'
    })\n`,
  );
}

function runExport(args: ParsedArgs): void {
  const bundlePath = required(args, 'bundle');
  const outDir = required(args, 'out');
  const bundle = readBundleFile(bundlePath);
  const result = exportApp({
    bundle,
    outDir,
    ...(args.flags.template ? { templateDir: args.flags.template } : {}),
  });
  process.stdout.write(
    `Exported app to ${result.outDir}\n` +
      `  bundle: ${result.bundlePath}\n` +
      `  next:   cd ${result.outDir} && pnpm install && pnpm build\n`,
  );
}

async function runServe(args: ParsedArgs): Promise<void> {
  const dir = args.flags.dir ?? 'dist';
  const port = args.flags.port ? Number(args.flags.port) : undefined;
  const { port: actual } = await serve({ dir, ...(port !== undefined ? { port } : {}) });
  process.stdout.write(`Serving ${dir} at http://localhost:${actual}\n`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.booleans.has('help') || args.booleans.has('h') || !args.command) {
    process.stdout.write(HELP);
    return;
  }
  if (args.booleans.has('version') || args.booleans.has('v')) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  switch (args.command) {
    case 'bundle':
    case 'import':
      runBundle(args);
      return;
    case 'export':
      runExport(args);
      return;
    case 'serve':
      await runServe(args);
      return;
    default:
      fail(`unknown command "${args.command}". Run with --help.`);
  }
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
