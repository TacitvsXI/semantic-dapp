# ADR-002: Semantic manifest as intermediate representation

- Status: Accepted
- Date: 2026-07-19

## Context

The pipeline goes from a contract to a generated interface. We need a stable
boundary between _analysis_ (what the system understood) and _rendering_ (the
generated UI). That boundary must be editable, reviewable, diffable and
exportable.

## Decision

A **semantic manifest** is the machine-readable representation of what the system
understood about a contract. It sits between analysis and UI.

- The manifest is defined and validated in `packages/spec` (TypeScript types +
  Zod schema + JSON Schema export).
- Analyzer and classifier **produce** a manifest; the renderer **consumes** it.
- The manifest is versioned, bound to chain ID + contract address, and (for
  proxies) to the implementation address and code hash.
- Manual user edits are first-class and are not overwritten without a review
  diff. After an upgrade, the manifest is marked stale by code-hash mismatch.
- Schema migrations live in `packages/spec` (migrations framework, later phase).

## Consequences

- Every stage has a clear contract; packages stay decoupled.
- The manifest can be exported/imported and drives the standalone app export.
- The renderer never depends on analyzer internals - only on the manifest schema.
