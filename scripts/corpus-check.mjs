#!/usr/bin/env node
// Real-contract regression harness for the analyzer/classifier.
//
//   node scripts/corpus-check.mjs                  compare vendored ABIs to the baseline
//   node scripts/corpus-check.mjs --update         regenerate scripts/corpus/baseline.json
//   node scripts/corpus-check.mjs --fetch          (network) refresh vendored ABIs
//   node scripts/corpus-check.mjs --fetch-sources  (network) vendor trimmed source for
//                                                  contracts flagged "source": true
//
// The default and --update modes are fully offline and deterministic: they read
// the ABIs vendored under scripts/corpus/abis/ (and, for source-backed rows, the
// trimmed sources under scripts/corpus/sources/) so a rule change - including
// NatSpec/modifier/body-access enrichment - can be measured against real mainnet
// contracts without a network call or an explorer key.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizeAbi, parseAbiJson } from '@semantic-dapp/spec';
import { buildManifest } from '@semantic-dapp/classifier';
import { parseNatSpec } from '@semantic-dapp/analyzer';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, 'corpus');
const ABIS = join(CORPUS, 'abis');
const SOURCES = join(CORPUS, 'sources');
const BASELINE = join(CORPUS, 'baseline.json');
const BLOCKSCOUT = 'https://eth.blockscout.com/api';

const mode = process.argv.includes('--fetch')
  ? 'fetch'
  : process.argv.includes('--fetch-sources')
    ? 'fetch-sources'
    : process.argv.includes('--update')
      ? 'update'
      : 'compare';

const contracts = JSON.parse(readFileSync(join(CORPUS, 'contracts.json'), 'utf8'));
const abiPath = (c) => join(ABIS, `${c.chainId}-${c.address.toLowerCase()}.json`);
const sourcePath = (c) => join(SOURCES, `${c.chainId}-${c.address.toLowerCase()}.json`);

/* --------------------------------- fetch --------------------------------- */

async function getSource(address) {
  const p = new URLSearchParams({ module: 'contract', action: 'getsourcecode', address });
  const r = await fetch(`${BLOCKSCOUT}?${p}`);
  const b = await r.json();
  if (b.status !== '1' || !Array.isArray(b.result) || !b.result[0])
    throw new Error(b.message ?? 'no result');
  return b.result[0];
}

// Keep only what detection needs (functions + events); drop errors/constructor to
// keep the vendored fixtures small.
const trim = (abi) => abi.filter((i) => i.type === 'function' || i.type === 'event');

// Extract Solidity source files from a Blockscout/Etherscan getsourcecode entry.
// Handles a plain flattened `SourceCode`, an Etherscan standard-json blob, and
// Blockscout's `AdditionalSources`. Keeps only files that declare functions or
// modifiers (that's all NatSpec/access detection needs) to keep fixtures small.
function getSourceFiles(entry) {
  const files = [];
  const push = (path, content) => {
    if (typeof content === 'string' && /\b(function|modifier)\b/.test(content)) {
      files.push({ path: path || 'Contract.sol', content });
    }
  };

  let raw = entry.SourceCode ?? '';
  // Etherscan wraps standard-json input in an extra pair of braces: {{ ... }}.
  if (typeof raw === 'string' && raw.startsWith('{')) {
    const unwrapped = raw.startsWith('{{') ? raw.slice(1, -1) : raw;
    try {
      const parsed = JSON.parse(unwrapped);
      const sources = parsed.sources ?? parsed;
      for (const [path, v] of Object.entries(sources)) {
        push(path, typeof v === 'string' ? v : v?.content);
      }
      raw = '';
    } catch {
      /* not standard-json; treat as a flattened file below */
    }
  }
  if (raw) push(`${entry.ContractName ?? 'Contract'}.sol`, raw);

  for (const extra of entry.AdditionalSources ?? []) {
    push(extra.Filename, extra.SourceCode);
  }
  return files;
}

async function fetchSources() {
  mkdirSync(SOURCES, { recursive: true });
  for (const c of contracts.filter((x) => x.source)) {
    try {
      const entry = await getSource(c.address);
      const files = getSourceFiles(entry);
      if (files.length === 0) throw new Error('no source files with functions/modifiers');
      const payload = {
        label: c.label,
        chainId: c.chainId,
        address: c.address,
        contractName: entry.ContractName ?? null,
        files,
      };
      writeFileSync(sourcePath(c), JSON.stringify(payload, null, 2) + '\n');
      const bytes = files.reduce((s, f) => s + f.content.length, 0);
      console.log(`sourced ${c.label} (${files.length} file(s), ${bytes} bytes)`);
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.log(`FAILED source ${c.label}: ${err.message}`);
    }
  }
}

async function fetchAll() {
  mkdirSync(ABIS, { recursive: true });
  for (const c of contracts) {
    try {
      let entry = await getSource(c.address);
      let via = 'address';
      if (c.followProxy && entry.Implementation && /^0x[0-9a-fA-F]{40}$/.test(entry.Implementation)) {
        const impl = await getSource(entry.Implementation).catch(() => null);
        if (impl?.ABI && !impl.ABI.startsWith('Contract source')) {
          entry = impl;
          via = `impl:${c.address}`;
        }
      }
      const parsed = parseAbiJson(entry.ABI);
      if (!parsed.success) throw new Error('ABI parse failed');
      const payload = {
        label: c.label,
        chainId: c.chainId,
        address: c.address,
        contractName: entry.ContractName ?? null,
        via,
        abi: trim(parsed.abi),
      };
      writeFileSync(abiPath(c), JSON.stringify(payload, null, 2) + '\n');
      console.log(`fetched ${c.label} (${payload.abi.length} fns+events, via ${via})`);
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.log(`FAILED ${c.label}: ${err.message}`);
    }
  }
}

/* -------------------------------- snapshot ------------------------------- */

function snapshot(c) {
  const vendored = JSON.parse(readFileSync(abiPath(c), 'utf8'));
  const model = normalizeAbi(vendored.abi);

  // Source-backed rows also feed NatSpec/modifier/body-access enrichment, so the
  // baseline captures those gains (descriptions, input labels, privilege upgrades).
  let docs;
  if (c.source && existsSync(sourcePath(c))) {
    const src = JSON.parse(readFileSync(sourcePath(c), 'utf8'));
    docs = parseNatSpec(src.files);
  }

  const manifest = buildManifest(model, {
    projectName: c.label,
    contractId: 'c',
    chainId: c.chainId,
    abiSource: 'explorer',
    ...(docs ? { docs } : {}),
  });
  const ops = manifest.operations;
  const writes = ops.filter((o) => !o.isRead);
  const unknownWrites = writes.filter((o) => o.operationType === 'unknown').length;
  const avg = ops.length ? ops.reduce((s, o) => s + o.confidence, 0) / ops.length : 0;
  const out = {
    standards: manifest.contracts[0].standards,
    counts: {
      ops: ops.length,
      writes: writes.length,
      classifiedWrites: writes.length - unknownWrites,
      unknownWrites,
    },
    avgConfidencePct: Math.round(avg * 100),
    ops: ops
      .map((o) => `${o.function} => ${o.operationType}/${o.audience}${o.risk ? '/' + o.risk.level : ''}`)
      .sort(),
  };

  // Only emit enrichment metrics for source-backed rows (keeps the ABI-only rows
  // unchanged and makes NatSpec/access improvements a visible, regression-guarded
  // number).
  if (docs) {
    const privileged = writes.filter(
      (o) => o.audience === 'admin' || o.audience === 'emergency',
    ).length;
    out.enriched = {
      descriptions: ops.filter((o) => o.description).length,
      inputLabels: ops.reduce(
        (s, o) => s + o.inputs.filter((i) => i.description).length,
        0,
      ),
      privilegedWrites: privileged,
    };
  }
  return out;
}

function snapshotAll() {
  const out = {};
  for (const c of contracts) {
    if (!existsSync(abiPath(c))) {
      console.log(`(skip ${c.label}: no vendored ABI - run --fetch)`);
      continue;
    }
    out[c.label] = snapshot(c);
  }
  return out;
}

/* --------------------------------- diff ---------------------------------- */

function diff(base, next) {
  let changed = 0;
  for (const label of Object.keys(next)) {
    const a = base[label];
    const b = next[label];
    if (!a) {
      console.log(`\n+ ${label}: NEW in corpus`);
      changed++;
      continue;
    }
    const lines = [];
    if (JSON.stringify(a.standards) !== JSON.stringify(b.standards))
      lines.push(`  standards: [${a.standards}] -> [${b.standards}]`);
    if (JSON.stringify(a.counts) !== JSON.stringify(b.counts))
      lines.push(`  counts: ${JSON.stringify(a.counts)} -> ${JSON.stringify(b.counts)}`);
    if (a.avgConfidencePct !== b.avgConfidencePct)
      lines.push(`  avg confidence: ${a.avgConfidencePct}% -> ${b.avgConfidencePct}%`);
    if (JSON.stringify(a.enriched) !== JSON.stringify(b.enriched))
      lines.push(
        `  enriched: ${JSON.stringify(a.enriched ?? null)} -> ${JSON.stringify(b.enriched ?? null)}`,
      );
    const before = new Set(a.ops);
    const after = new Set(b.ops);
    for (const op of b.ops) if (!before.has(op)) lines.push(`  + ${op}`);
    for (const op of a.ops) if (!after.has(op)) lines.push(`  - ${op}`);
    if (lines.length) {
      console.log(`\n~ ${label}`);
      console.log(lines.join('\n'));
      changed++;
    }
  }
  return changed;
}

/* --------------------------------- main ---------------------------------- */

if (mode === 'fetch') {
  await fetchAll();
} else if (mode === 'fetch-sources') {
  await fetchSources();
} else if (mode === 'update') {
  const snap = snapshotAll();
  writeFileSync(BASELINE, JSON.stringify(snap, null, 2) + '\n');
  console.log(`Wrote baseline for ${Object.keys(snap).length} contracts.`);
} else {
  if (!existsSync(BASELINE)) {
    console.log('No baseline yet. Run: node scripts/corpus-check.mjs --update');
    process.exit(1);
  }
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const next = snapshotAll();
  const changed = diff(base, next);
  if (changed) {
    console.log(`\n${changed} contract(s) changed vs baseline.`);
    console.log('Review the diff. If intended, refresh with: node scripts/corpus-check.mjs --update');
    process.exit(1);
  }
  console.log(`OK - ${Object.keys(next).length} contracts match the baseline.`);
}
