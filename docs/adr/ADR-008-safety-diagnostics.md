# ADR-008: Untrusted-input safety & local audit trail

- Status: Accepted
- Date: 2026-07-19

## Context

The studio renders data that originates from untrusted places: contract-provided
strings (token `name`/`symbol`, NatSpec), imported manifests, and on-chain state.
It also sends irreversible transactions. Three concrete risks were unaddressed
after Phase 6:

1. **Text spoofing** - bidi overrides, zero-width characters and mixed-script
   homoglyphs can make a malicious `name()` look like a trusted one, or hide
   content in a title/description.
2. **Preflight blind spots** - a user can confirm a write while on the wrong
   network, against an unverified ABI, or against a manifest that no longer
   matches the deployed (upgraded) implementation.
3. **No audit trail** - there was no record of what was executed, which matters
   for a tool that self-hosts and touches funds.

## Decision

- **A pure safety core in `packages/spec`** (`safety.ts`): `sanitizeText` returns
  cleaned text plus a list of `TextIssue`s (control / bidi / zero-width /
  mixed-script / too-long); `writeWarnings` turns a `WriteSafetyContext` (wallet
  vs contract chain, verified, stale, risk) into severity-ranked
  `SafetyWarning`s. Both are deterministic and unit-tested - no React, no chain.
- **Sanitize at the render boundary.** A `SafeText` component wraps every place an
  untrusted string is shown; it displays the cleaned text and a ⚠ marker
  explaining detected issues, rather than trusting or dropping the value.
- **Preflight warnings live in the confirmation flow.** `ConfirmDialog` gains a
  `warnings` prop; the renderer computes them per write from the safety context
  and shows them before the Confirm button. This reuses the Phase 6 modal instead
  of adding a parallel mechanism.
- **The audit log is local-first.** The studio records terminal write results
  (success/error, with tx hash, args summary, chain and timestamp) to
  `localStorage` per project, viewable and exportable via a presentational
  `AuditLog`. No backend, consistent with the self-hostable design.

## Consequences

- Spoofed contract metadata is visibly flagged; users get a clear reason.
- The confirm step becomes a genuine preflight (network / verification /
  staleness / risk), not just a checkbox.
- Users have an exportable history of what they executed.
- The core checks are portable: exported apps can reuse `sanitizeText`,
  `writeWarnings` and the presentational components without the studio.
- Future work (NatSpec sanitization at import time, richer diagnostics scoring,
  simulation-based warnings) builds on the same `SafetyWarning` type. Tracked in
  the backlog.
