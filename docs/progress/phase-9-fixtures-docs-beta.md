# Phase 9 — Fixtures, Docs & Public Beta

Goal (Execution Plan §17.9): prove the pipeline on **production-like contracts**,
make it easy for others to try, and cut the first public beta. Three fixtures
(fungible token, vault, role-gated RWA) exercise the analyzer end-to-end; demo
bundles render them in the standalone app; CI covers Solidity + the standalone
app; and the packages are versioned for `v0.1.0-beta`.

Slice: `ERC-4626 + RWA fixtures with forge tests → real ABIs drive analyzer tests
→ three demo bundles + a demos guide → a11y smoke → CI + release prep`.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

## Fixtures (`contracts/fixtures`)

- [x] `MockVault.sol` — self-contained ERC-4626 vault over an ERC-20 asset
- [x] `MockRWA.sol` — role-gated token: AccessControl-style roles + Pausable +
      mint/burn (models an RWA/stablecoin admin surface)
- [x] Forge tests for both; `Deploy.s.sol` deploys all fixtures
- [x] Update `contracts/fixtures/README.md`

## Analyzer coverage from real ABIs

- [x] Commit compiled ABIs (`contracts/fixtures/abi/*.json`)
- [x] Analyzer/classifier tests asserting detection on the real ABIs
      (ERC-4626 vault; RWA → access-control + pausable, roles routed to Admin)

## Demos (`docs/demo`)

- [x] Three committed demo bundles (ERC-20, ERC-4626 vault, RWA)
- [x] `docs/demos.md` — what each demonstrates + how to run locally

## Accessibility

- [x] `@axe-core/playwright` smoke on the rendered app (no serious/critical
      violations)
- [x] Small a11y fixes surfaced by the audit

## CI

- [x] `forge test` job for the fixtures
- [x] generated-app e2e added to the e2e job

## Release prep

- [x] `CHANGELOG.md` (Keep a Changelog format)
- [x] Bump versions to `0.1.0-beta`
- [x] README status refreshed to beta

## Docs & ADR

- [x] ADR-010 — fixtures, demos & release readiness
- [x] Update `PROGRESS.md`, `docs/roadmap.md`, backlog
- [x] lint / typecheck / test / build / forge / e2e green

## Definition of done

- [x] `forge test` passes for all three fixtures
- [x] Analyzer tests detect vault + RWA capabilities from the real ABIs
- [x] Each demo bundle renders in the standalone app
- [x] a11y smoke passes; CI covers forge + both e2e suites
- [x] Versions read `0.1.0-beta`; CHANGELOG written
