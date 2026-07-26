# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches
`1.0.0`. While in `0.x`, minor versions may include breaking changes.

## [0.1.2] - 2026-07-26

Universal hardening pass: proxy/diamond resolution, more token & governance shapes,
admin evidence in the UI, and a live-demo “load your contract” flow.

### Added

- **EIP-2535 diamond support**: loupe `facetAddresses()` detection, per-facet ABI
  fetch + selector-deduped merge; diamond address stays the call target;
  `diamondCut` labelled upgrade/critical.
- **Governor Bravo/Alpha** shape detector (Compound-style propose/queue/execute),
  disjoint from OpenZeppelin Governor.
- **DAI-style permit**, **ERC-777**, **rebasing / share-based** tokens, and a
  **fee-on-transfer** advisory (fee-exclusion admin surface + Overview warning).
- **ERC-1155 nuances**: Supply / Burnable / mintBatch semantics.
- **NatSpec + body-level access detection**, **PermissionBadge**, **tx Preview /
  dry-run**, **proxy implementation override**, Aragon ERC-897 + `*Delegator`
  proxy shapes, event-based corroboration.
- **Live demo**: “Load your contract” (address or paste ABI) on GitHub Pages.
- **Real-contract corpus** harness (incl. source-backed DAI/BAYC rows).

### Changed

- Risk heuristic: `payable` is a medium floor, not an override of user routing.
- Signature-aware `mint` / `withdraw` heuristics to cut false admin labels.

## [0.1.1] - 2026-07-25

First npm release: all nine `@semantic-dapp/*` packages published under the scope,
plus new user-facing panels.

### Added

- **Governor proposal-builder & board**: a `GovernorPanel` with Propose / Vote tabs
  and a `ProposalBoard` that tracks proposals by id with live `state`, proposer,
  vote-start/end and `hasVoted` for the connected account.
- **ERC-721 gallery**: `NftGallery` + `Erc721Actions` list the connected owner's
  tokens, inspect any token id, resolve `tokenURI` metadata (ipfs/data/http), and
  transfer owned tokens inline (`safeTransferFrom`).
- **ERC-1155 batch panel**, **ERC-4626 vault panel**, **ERC-2612 permit** detector
  and decimals-aware amount widgets.

### Changed

- **npm publishing**: `publishConfig.access=public`, repo metadata and
  `release`/`release:dry` scripts on every package; OIDC trusted-publishing
  workflow (`.github/workflows/release.yml`) and `docs/RELEASING.md`.

## [0.1.0-beta] - 2026-07-19

First public beta: the full pipeline from a contract to a shippable dApp, proven
on production-like fixtures.

### Added

- **Address resolver** (Phase 2): import by chain + address via block explorer
  (Etherscan v2) and Sourcify, with EIP-1967 proxy detection and implementation
  binding.
- **Semantic manifest** (Phase 3): a versioned, machine-readable manifest as the
  layer between analysis and UI, with migrations, staleness detection and
  `mergeReviewed` to preserve human edits across re-analysis.
- **Standards analyzer** (Phase 4): member-based detection for ERC-721/1155/4626
  and access models (Ownable, AccessControl, Pausable, Upgradeable) with
  confidence scoring and evidence.
- **Classification & routing** (Phase 5): a priority rule engine that routes every
  function to a semantic operation, audience and risk - never dropping a function.
- **Trusted UI components** (Phase 6): purpose-built Overview, Pause and Role
  Manager consoles and a `ConfirmDialog` gating high/critical writes (critical
  actions require typing `CONFIRM`).
- **Safety & diagnostics** (Phase 7): text sanitization (`sanitizeText`/`SafeText`
  strip bidi/zero-width/control chars, flag homoglyphs), preflight write warnings,
  and a local, exportable execution history (audit trail).
- **Export & CLI** (Phase 8): a portable `SemanticBundle` (identity + ABI +
  reviewed manifest), a one-click studio export, a standalone `generated-app`
  template that renders any bundle analyzer-free, and a `semantic-dapp` CLI
  (`bundle` / `export` / `serve`).
- **Fixtures, demos & beta** (Phase 9): `MockVault` (ERC-4626) and `MockRWA`
  (roles + pause) Foundry fixtures with tests; analyzer/classifier tests driven by
  the real compiled ABIs; three committed demo bundles (ERC-20, vault, RWA) and a
  demos guide; an `@axe-core/playwright` accessibility gate on the standalone app;
  and CI jobs for the Solidity fixtures and the standalone e2e.

### Changed

- Bumped all workspace packages to `0.1.0-beta`.
- Raised UI text contrast (audience/risk/emergency badges, connect button) to meet
  WCAG AA.

### Docs

- ADR-002 … ADR-010 covering resolver, manifest, standards, classification,
  trusted UI, safety, export, and fixtures/release decisions.

## [0.0.1] - 2026-07-19

### Added

- **Foundation** (Phase 0): pnpm + Turborepo monorepo, TypeScript strict, ESLint /
  Prettier, CI, and the initial package layout.
- **Raw ABI runtime vertical slice** (Phase 1): manual ABI/artifact import →
  normalized contract model → first ERC-20 detector → generated User/Admin/Raw UI →
  wallet read/write against Anvil, with local project persistence.

[0.1.0-beta]: https://github.com/TacitvsXI/semantic-dapp/releases/tag/v0.1.0-beta
[0.0.1]: https://github.com/TacitvsXI/semantic-dapp/releases/tag/v0.0.1
