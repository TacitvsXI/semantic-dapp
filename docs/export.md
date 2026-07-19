# Export & CLI

Ship a self-contained dApp from a reviewed contract. The portable artifact is a
**SemanticBundle** (`packages/export`): identity + ABI + reviewed manifest in one
JSON. Both the studio and the CLI produce it, and the standalone template
(`apps/generated-app`) renders it (see [ADR-009](adr/ADR-009-export-bundle-template.md)).

## From the studio

1. Open a project and review its manifest.
2. Click **Export app** to download `*.bundle.json`.
3. Hand that bundle to the CLI's `export`, or drop it next to a built template as
   `bundle.json`.

Use **Export manifest** if you only need the manifest (no ABI/identity).

## CLI: `semantic-dapp`

Within the monorepo, build first (`pnpm -w build`) then run
`node packages/cli/dist/cli.js <command>` (or link the `semantic-dapp` bin).

### `bundle` (alias `import`) - ABI → bundle

```bash
semantic-dapp bundle \
  --abi ./erc20.abi.json \
  --name "My Token" \
  --chain 1 \
  --address 0xYourContract \
  --rpc https://rpc.example \
  --out mytoken.bundle.json
```

- `--abi` accepts a bare ABI array or a Foundry/Hardhat artifact (`{ "abi": [...] }`).
- Analysis (standards detection + classification) runs locally; no network calls.

### `export` - bundle → standalone app

```bash
semantic-dapp export --bundle mytoken.bundle.json --out ./my-dapp
```

Copies the `generated-app` template into `./my-dapp` and injects the bundle as
`public/bundle.json`. Then:

```bash
cd ./my-dapp && pnpm install && pnpm build
```

Pass `--template <dir>` to use a customized template.

### `serve` - preview a built site

```bash
semantic-dapp serve --dir ./my-dapp/dist --port 4174
```

A zero-dependency static server with SPA fallback. Any static host works too
(Netlify, Vercel, GitHub Pages, S3): upload the `dist/` folder.

## How the template loads a bundle

At runtime the app fetches `bundle.json` next to `index.html`. If it is missing or
invalid, it falls back to a committed demo bundle so the template always renders.
Regenerate the demo with `pnpm --filter @semantic-dapp/generated-app gen:demo`.

## Current limitations

- The exported app depends on the workspace `@semantic-dapp/*` packages; a true
  standalone install outside this repo needs them published to npm.
- CLI `import` currently takes an ABI file; address resolution lives in the
  studio (resolver adapters). Both are tracked in the backlog.
