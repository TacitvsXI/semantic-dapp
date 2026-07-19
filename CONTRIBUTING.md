# Contributing to Semantic Dapp

Thanks for your interest in contributing! This project is open-source first and
built in the open.

## Getting started

1. Install prerequisites: Node `>=20` (see `.nvmrc`), pnpm `>=10`, and
   [Foundry](https://book.getfoundry.sh/) for contract fixtures.
2. Install dependencies: `pnpm install`.
3. Run the checks that CI runs:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```

## Repository conventions

- **TypeScript strict** everywhere. No `any` without justification.
- **Deterministic-first**: prefer explicit rules and evidence over heuristics.
  Never hide uncertainty from the user.
- **No silent fallback**: unknown functions must remain reachable in the Raw UI.
- Use conventional-ish commit messages (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).

## Definition of Done for a change

- [ ] There is an issue with acceptance criteria (for non-trivial work).
- [ ] There is a unit or integration test.
- [ ] The error path is handled; no silent fallback.
- [ ] For semantic features, the UI shows confidence/evidence.
- [ ] Docs and examples/fixtures are updated.
- [ ] `lint`, `typecheck`, `test` and `build` pass in CI.

## Architecture decisions

Significant decisions are recorded as ADRs under [`docs/adr/`](docs/adr/).
Add a new numbered ADR when you make a decision that is hard to reverse.

## Issue labels

`core`, `resolver`, `analyzer`, `ui`, `security`, `docs`, `good-first-issue`.

## Progress tracking

The living plan and checklists are in [`docs/`](docs/). Keep
[`docs/progress/`](docs/progress/) and [`PROGRESS.md`](PROGRESS.md) up to date as
you complete work.
