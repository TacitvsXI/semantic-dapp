# ADR-004: Manifest versioning & migration strategy

- Status: Accepted
- Date: 2026-07-19

## Context

The semantic manifest (ADR-002) is exported, imported, hand-edited and persisted
in the browser. As the schema evolves across phases (new operation types, input
widgets, contract fields), previously saved or exported manifests must remain
loadable — otherwise users lose work and shared manifests rot.

We also need to detect when a manifest no longer matches the on-chain contract.
For proxies the address is stable but the **implementation** (hence the ABI and
semantics) can change on upgrade.

## Decision

- The manifest carries an integer `version`. `packages/spec` owns
  `CURRENT_MANIFEST_VERSION` and a **migration framework**: an ordered set of
  `N → N+1` transforms applied to raw input before schema validation.
- `migrateManifest(input)` returns a typed result: it upgrades step-by-step to
  the current version, validates with the Zod schema, and reports
  `fromVersion`/`toVersion` or a precise error. Manifests **newer** than the
  supported version are rejected rather than silently mishandled.
- Migrations are pure data transforms with no network or environment access, so
  they are deterministic and unit-testable.
- **Human edits are authoritative.** Re-analysis refreshes technical fields
  (inputs, selector, confidence, evidence) but preserves human-edited display
  fields (title, description, audience, visibility) for operations marked
  `reviewed` (`mergeReviewed`).
- **Staleness** is detected by comparing the manifest's stored implementation
  code hash to the live one (`isManifestStale`). The studio surfaces a banner and
  offers re-analysis; it never silently overwrites the manifest.

## Consequences

- Old and shared manifests keep loading as the schema grows; upgrades are
  explicit and testable.
- Users can trust that manual work survives re-analysis and upgrades.
- The resolver's code-hash output (ADR-003) feeds staleness detection directly.
- Adding a schema version is a mechanical change: bump the constant, add one
  migration, add a test.
