# Phase 3 - Semantic Manifest

Goal (Execution Plan §17.3): make the manifest (ADR-002) a **first-class,
editable, round-trippable artifact**. Users can import/export a manifest, edit it
(form + raw JSON), and the studio warns when an upgrade makes it stale. Schema
migrations keep old manifests loadable.

Slice: `export ⇄ import round-trip · form + raw-JSON editor · reviewed edits
survive re-analyze · staleness by implementation code hash · versioned schema
with a migration framework`.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · status: **implemented**

## `packages/spec`

### Versioning & migrations

- [x] `CURRENT_MANIFEST_VERSION` constant
- [x] `migrateManifest(input)` - read `version`, apply ordered N→N+1 migrations,
      validate the result; typed result with `fromVersion`/`toVersion`/error
- [x] Reject manifests newer than the supported version
- [x] Unit tests (identity v1, missing version, too-new, invalid)

### Staleness

- [x] `manifestCodeHash(manifest, contractId?)`
- [x] `isManifestStale(manifest, currentCodeHash, contractId?)` (compares stored
      implementation code hash to the live one)
- [x] Unit tests (match / mismatch / missing data)

## `packages/classifier`

- [x] `set-description` review action
- [x] `mergeReviewed(previous, fresh)` - re-analysis refreshes technical fields
      but preserves human-edited display fields for reviewed operations (ADR-002)
- [x] `buildManifest` accepts `implementationAddress` / `implementationCodeHash`
- [x] Unit tests (merge preserves reviewed, refreshes analysis)

## `apps/studio`

### Manifest binding

- [x] Persist `codeHash` on `Project` (from the resolver result)
- [x] `computeManifest` derives `abiSource` from provenance and passes
      implementation address + code hash into the manifest
- [x] Re-analyze preserves reviewed operations via `mergeReviewed`

### Import / export round-trip

- [x] **Import manifest** (file) → `migrateManifest` → validate → persist
- [x] Errors shown inline; export already exists (JSON download)

### Manifest editor

- [x] `ManifestEditor` overlay opened from `ProjectView`
- [x] Operations tab: edit title, description, audience, visibility, reviewed
- [x] Raw JSON tab: edit + validate (`safeParseManifest`) before applying
- [x] Save persists; Cancel discards

### Staleness banner

- [x] On open, fetch live code hash (implementation for proxies) and compare
- [x] Banner offers Re-analyze when stale

## Docs & CI

- [x] ADR-004 - manifest versioning & migration strategy
- [x] Update `PROGRESS.md`, `docs/roadmap.md`, backlog
- [x] Keep lint/typecheck/test/build/e2e green

## Definition of done

- [x] Export a manifest, re-import it into a fresh project - identical result
- [x] Edit an operation (form or JSON), save, and see it reflected in the app
- [x] Re-analyze keeps reviewed edits
- [x] Upgrading the implementation surfaces a staleness banner
- [x] Old-version manifests load via migration; all checks green

## Deferred (follow-ups)

- Re-analyze refreshes classification on the **current** ABI + code hash. Full
  re-resolution (re-fetching a new ABI after an upgrade) reuses the Phase 2
  resolver and is tracked as a follow-up.
- Raw-JSON editor is textarea-based; a schema-aware editor with inline field
  hints can come with the Phase 3+ polish.
