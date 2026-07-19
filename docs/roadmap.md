# Roadmap

Source of truth: `Semantic Dapp — Open-source Execution Plan`. MVP horizon:
10–12 weeks for a solo developer. Version 0.1 target.

## Phases

| Phase | Timeframe   | Focus                    | Output                                            |
| ----- | ----------- | ------------------------ | ------------------------------------------------- |
| 0     | 2–3 days    | Decisions & repo setup   | Monorepo, license, spec draft, CI skeleton        |
| 1     | Week 1      | Raw contract runtime     | Import ABI, render read/write, wallet execution   |
| 2     | Week 2      | Address resolver         | Chain/address import, ABI/source/proxy adapters   |
| 3     | Week 3      | Semantic manifest        | Schema, editor, save/load, migrations             |
| 4     | Weeks 4–5   | Standards analyzer       | ERC-20/721/1155/4626 + Ownable/AccessControl      |
| 5     | Week 6      | Classification & routing | User/Admin/Emergency/Raw sections                 |
| 6     | Week 7      | Trusted UI components    | Token, vault, role, pause and raw components      |
| 7     | Week 8      | Safety & diagnostics     | Simulation, errors, risk, fingerprints            |
| 8     | Week 9      | Export & CLI             | Standalone app and npx workflow                   |
| 9     | Weeks 10–12 | Fixtures, docs, beta     | Foundry contracts, Playwright, docs, v0.1 release |

## Release milestones

| Milestone         | Demo                            | Gate                                       |
| ----------------- | ------------------------------- | ------------------------------------------ |
| M1 — Raw Runtime  | ABI → working interface         | All ABI types, read/write, wallet          |
| M2 — Semantic ERC | ERC-20/4626 → understandable UI | Standards recognized without manual config |
| M3 — Admin Split  | AccessControl → admin console   | Roles and risk evidence visible            |
| M4 — Export       | One-click standalone build      | Works without Studio backend               |
| M5 — Public Beta  | 3 production-like demos         | Docs, CI, security policy, issue templates |

## Current status

See [`../PROGRESS.md`](../PROGRESS.md) for the live dashboard. Phase 1 shipped as
`v0.0.1` ([checklist](progress/phase-1-vertical-slice.md)). Phase 2 (address
resolver) is implemented ([checklist](progress/phase-2-address-resolver.md),
[ADR-003](adr/ADR-003-resolver-adapters.md)): `packages/resolver` with Sourcify +
block-explorer adapters and EIP-1967 proxy detection, wired into the studio's
**By address** import. Phase 3 (semantic manifest) is implemented
([checklist](progress/phase-3-semantic-manifest.md),
[ADR-004](adr/ADR-004-manifest-versioning.md)): manifest import/export round-trip,
a form + raw-JSON editor, reviewed-edit preservation on re-analyze, staleness
detection by code hash, and a schema migration framework. Phase 4 (standards
analyzer) is implemented ([checklist](progress/phase-4-standards-analyzer.md),
[ADR-005](adr/ADR-005-standards-detection.md)): a generic member-based detection
engine with ERC-721/1155/4626 detectors, Ownable/AccessControl/Pausable/
Upgradeable capabilities, an access model, and a semantics registry the
classifier uses to route and permission every function. Phase 5 (classification &
routing) is implemented ([checklist](progress/phase-5-classification-routing.md),
[ADR-006](adr/ADR-006-classification-rule-engine.md)): a priority-based rule
engine with name/risk heuristics that routes non-standard functions (admin
setters, fund withdrawals, pausers, claims) and surfaces reads, while standards
stay authoritative and evidence accumulates for transparency. Phase 6 (trusted UI
components) is implemented ([checklist](progress/phase-6-trusted-ui.md),
[ADR-007](adr/ADR-007-trusted-ui-dispatch.md)): an Overview summary, grouped Pause
and Role consoles dispatched by `operationType`, and a reusable ConfirmDialog that
gates high/critical/privileged writes (critical actions require typing `CONFIRM`).
Phase 7 (safety & diagnostics) is implemented
([checklist](progress/phase-7-safety-diagnostics.md),
[ADR-008](adr/ADR-008-safety-diagnostics.md)): a pure safety core sanitizes
untrusted text (bidi/zero-width/control/homoglyph) via `SafeText`, computes
preflight `writeWarnings` (wrong network, unverified source, stale manifest,
critical risk) surfaced in the ConfirmDialog, and the studio keeps a local,
exportable execution history (audit trail) of every transaction. Phase 8 (export
& CLI) is implemented ([checklist](progress/phase-8-export-cli.md),
[ADR-009](adr/ADR-009-export-bundle-template.md), [guide](export.md)): a portable
`SemanticBundle` (`packages/export`), a `semantic-dapp` CLI (`packages/cli`) that
turns an ABI into a bundle, scaffolds a standalone app and serves it, and a
`generated-app` template (`apps/generated-app`) that renders any bundle at runtime
without the studio.

## In scope for the open-source MVP

- Import any EVM contract by chain ID + address
- Manual import of ABI, Foundry/Hardhat artifact and Solidity compiler output
- Proxy resolution and implementation binding
- ABI, NatSpec and source parsing
- Standard, role, risk and UI-pattern recognition
- User / Operator / Admin / Emergency / Raw interfaces
- Wallet connection and transaction execution
- Semantic manifest editing and export
- Standalone application export
- CLI, React renderer and component library

## Deliberately out of scope for the first MVP

- Custody or key storage
- Fireblocks / Copper / BitGo production integrations
- A Tenderly-grade transaction simulator
- Solana / Tron / non-EVM networks
- A promise of 100% understanding of arbitrary bytecode
- Arbitrary LLM-generated frontend code
- Full multi-tenant SaaS, billing and enterprise SSO

## Tech stack & rationale

Chosen to match the execution plan and to stay self-hostable, deterministic and
type-safe end to end.

| Concern           | Choice                           | Why                                             |
| ----------------- | -------------------------------- | ----------------------------------------------- |
| Monorepo          | pnpm workspaces + Turborepo      | Standard TS monorepo; cached task graph         |
| Language          | TypeScript (strict)              | UI is generated from ABI types; safety is core  |
| Web3 core         | viem + wagmi + react-query       | De-facto 2026 standard; typed, tree-shakeable   |
| ABI types         | abitype                          | Native to viem; typed ABIs                      |
| Frontend          | React + Vite                     | Fast SPA; fits future static/self-hosted export |
| Schema/validation | Zod + zod-to-json-schema         | Backs the manifest-as-IR (ADR-002)              |
| Contracts/testing | Foundry (forge/anvil)            | Modern Solidity standard; ephemeral local chain |
| Tests             | Vitest + Playwright              | Fast unit + real integration/e2e                |
| Quality           | ESLint (flat) + Prettier + husky | Consistent, enforced in CI                      |

### Planned stack reinforcements (additive, no rewrite)

- **Wallet connectors** _(done)_: RainbowKit over wagmi provides the connect
  modal, account UI and network switching. Injected-only by default (no secret);
  set `VITE_WALLETCONNECT_PROJECT_ID` to enable the full wallet list +
  WalletConnect QR.
- **Bundle size**: web3/wallet libs are heavy; eager vendors are code-split via
  Vite `manualChunks` (react / web3 / rainbowkit) and RainbowKit lazy-loads its
  per-wallet and per-locale chunks. Revisit with route-level lazy loading.
- **Untrusted metadata**: when rendering NatSpec/metadata (Phases 4+), sanitize
  input (e.g. DOMPurify or strict text-only rendering) — see `SECURITY.md`.
- **State management**: React state + react-query suffice now; consider Zustand
  or Jotai for the manifest editor (Phase 3) only if needed.
- **Zod**: pinned to v3 (abitype peer); migrate to v4 as a dedicated task.

## Backlog after the vertical slice (Phases 2+)

Captured in [`progress/backlog.md`](progress/backlog.md).
