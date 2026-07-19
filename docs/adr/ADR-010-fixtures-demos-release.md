# ADR-010: Fixtures, demos & release readiness

- Status: Accepted
- Date: 2026-07-19

## Context

The pipeline (Phases 1–8) was validated mostly against hand-written or single
ERC-20 fixtures. Before a public beta it needs evidence that it works on
**production-like shapes** — a yield vault and a role-gated/pausable token — and a
low-friction way for newcomers to see results. It also needs a defensible release
posture: versioned packages, a changelog, and CI that guards both the Solidity
fixtures and the standalone app.

## Decision

- **Ship three self-contained Solidity fixtures** in `contracts/fixtures`:
  `MockERC20` (existing), `MockVault` (ERC-4626 over an ERC-20 asset) and
  `MockRWA` (AccessControl-style roles + Pausable + mint/burn). They intentionally
  avoid OpenZeppelin imports so the fixtures compile with zero external deps and
  stay readable as detection targets.

- **Drive analyzer tests from the real compiled ABIs**, not hand-written ones.
  The compiled ABIs are committed under `contracts/fixtures/abi/*.json` and
  imported by analyzer/classifier tests. This keeps tests fast (no forge at test
  time) while guaranteeing they reflect what the compiler actually emits.

- **Demos are `SemanticBundle`s** (Phase 8), one per fixture, committed under
  `docs/demo/bundles`. The standalone template renders any of them by dropping the
  file in as `bundle.json`, so a demo is just data — no bespoke demo app.

- **Accessibility is enforced, not asserted.** A `@axe-core/playwright` smoke runs
  against the rendered app and fails on serious/critical violations, turning a11y
  into a CI gate rather than a one-off manual pass.

- **CI gains a Solidity job and the standalone e2e.** `forge test` guards the
  fixtures; the generated-app Playwright smoke (incl. the axe check) runs
  alongside the studio smoke.

- **Versioning moves to `0.1.0-beta`** with a Keep-a-Changelog `CHANGELOG.md`.
  Tagging remains a manual, deliberate step (documented), consistent with how
  `v0.0.1` was cut.

## Consequences

- Detection is continuously verified against realistic contracts, catching
  regressions the ERC-20-only tests would miss.
- Newcomers can render three meaningfully different apps without a chain.
- a11y regressions break the build.
- CI runtime grows (a forge job + a second e2e), an acceptable cost for beta
  confidence.
- The fixtures are simplified models, not audited implementations; they exist for
  detection/demo, and the README says so. Publishing packages to npm and richer,
  audited example contracts remain backlog items.
