# ADR-009: Export bundle & standalone template

- Status: Accepted
- Date: 2026-07-19

## Context

Phases 1–7 produce a reviewed semantic manifest inside the studio, but the value
only lands when a team can **ship** a usable dApp from it. The Execution Plan
(§17.8) calls for a `generated-app` template, manifest injection on export, and a
`semantic-dapp` CLI (`import` / `serve` / `export`) — all without a backend and
hostable on any static host.

Two questions drove the design:

1. **What crosses the boundary between analysis and a shipped app?** The manifest
   alone is not enough — the app also needs the ABI (to encode calls) and the
   contract's identity (chain, address, RPC, explorer).
2. **How does a standalone app render without re-running analysis?** It should
   consume a finished artifact, not the analyzer, so exported apps stay small and
   deterministic.

## Decision

- **Introduce a portable `SemanticBundle`** (`packages/export`): a single,
  zod-validated JSON containing `{ generator, generatedAt, name, chainId, rpcUrl?,
address?, contractName?, explorerUrl?, abi, manifest }`. It reuses the existing
  `abiSchema` and `semanticManifestSchema`, so the bundle is exactly "identity +
  ABI + reviewed manifest" with nothing analyzer-specific. This is the one
  artifact that crosses the export boundary (answers Q1).

- **The standalone template renders the bundle at runtime** (`apps/generated-app`).
  It fetches `/bundle.json` (falling back to a committed demo bundle), rebuilds
  the `ContractModel` with `normalizeAbi`, and renders the same
  `@semantic-dapp/renderer` `GeneratedApp` the studio uses. Because it consumes a
  finished manifest, the exported app never imports the analyzer/classifier
  (answers Q2). Injecting the bundle as a static `public/bundle.json` means
  **export needs no rebuild of source** — the same built template serves any
  contract.

- **The CLI is dependency-light and library-first** (`packages/cli`). `bundle`
  (aka `import`) turns an ABI file into a bundle by calling the same
  `normalizeAbi` + `buildManifest` the studio uses; `export` copies the template
  and writes `public/bundle.json`; `serve` is a zero-dependency static server.
  The pure pieces (ABI parsing, bundle building) are unit-tested without touching
  the filesystem.

- **The studio exports the same bundle** with an "Export app" button, so a
  reviewed project and a CLI-produced project yield identical artifacts.

## Consequences

- One artifact (`SemanticBundle`) is shared by studio, CLI and template — no
  divergent formats.
- Exported apps are small and analyzer-free; a single built template can render
  any contract by swapping `bundle.json`.
- The template duplicates a small amount of wallet/runtime wiring from the studio
  by design: a template is meant to be copied and owned by its user, so it must
  be self-contained rather than importing studio internals. Extracting a shared
  `app-kit` package is deferred to the backlog.
- Address-based `import` in the CLI (resolver-backed) and publishing the packages
  to npm for a true `npx semantic-dapp` are follow-ups tracked in the backlog;
  within the monorepo the CLI resolves the template by path.
