# Phase 8 — Export & CLI

Goal (Execution Plan §17.8): let anyone take a reviewed contract and ship a
**self-contained dApp** that runs without the studio — plus a **CLI** to do it
headlessly. The manifest is the portable artifact; export packages it with the
ABI into a bundle that a standalone template renders.

Slice: `a portable SemanticBundle + a standalone generated-app template that
renders it + a semantic-dapp CLI (bundle / export / serve)`.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

## `packages/export` — portable bundle contract

- [x] `SemanticBundle` schema (zod): generator + timestamp, identity
      (name/chain/address/rpc/explorer), `abi`, `manifest`
- [x] `buildBundle(input)` — validate + fill defaults (generatedAt, generator)
- [x] `parseBundle(json)` — safe parse → `{ ok, bundle | error }`
- [x] `bundleFilename(name)` helper
- [x] Unit tests: round-trip, rejects malformed input

## `apps/generated-app` — standalone template

- [x] Vite React app that loads a bundle at runtime (`/bundle.json`) with a
      committed demo bundle fallback
- [x] Lean wallet providers + `useContractRuntime` (injected wallet, no studio)
- [x] Renders `@semantic-dapp/renderer` `GeneratedApp` from the bundle
- [x] Builds to a static site (hostable on any static host)
- [x] e2e smoke: default bundle renders tabs

## `packages/cli` — `semantic-dapp`

- [x] `bundle` (alias `import`): ABI file → `bundle.json` (normalize + classify)
- [x] `export`: `bundle.json` + template → output dir with the bundle injected
- [x] `serve`: static-serve a built/exported directory (zero-dep http server)
- [x] `--help` / `--version`; friendly errors
- [x] Unit tests: ABI parsing (array + artifact), bundle building, scaffold

## `apps/studio` — one-click export

- [x] "Export app" button → downloads a full `*.bundle.json` for the project

## Docs & CI

- [x] ADR-009 — export bundle & template architecture
- [x] `docs/export.md` — how to export and host; CLI usage
- [x] Update `PROGRESS.md`, `docs/roadmap.md`, backlog
- [x] lint / typecheck / test / build / e2e green

## Definition of done

- [x] `semantic-dapp bundle --abi erc20.json --name Demo --chain 1` writes a valid
      bundle
- [x] `semantic-dapp export --bundle bundle.json --out ./app` yields a buildable
      standalone app that renders the contract's UI
- [x] Studio can export a bundle that the template renders unchanged
- [x] All checks green

## Notes / follow-ups (backlog)

- Address-based `import` in the CLI (resolver-backed) is deferred; today `bundle`
  takes an ABI file. Studio already resolves by address.
- Publishing the packages to npm for a true `npx semantic-dapp` is deferred; in
  the monorepo the CLI resolves the template by path (or `--template`).
- Exported apps depend on the workspace `@semantic-dapp/*` packages; a true
  standalone `pnpm install` outside the repo needs those published.
