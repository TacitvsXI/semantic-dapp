# Phase 7 - Safety & Diagnostics

Goal (Execution Plan §17.7): make the generated app **trustworthy under adversarial
inputs**. Contracts and imported manifests carry attacker-controlled strings, may
live on the wrong network, may be unverified or upgraded since analysis, and any
write is irreversible. Phase 7 adds sanitization, preflight warnings and a local
audit trail - without a backend.

Slice: `sanitize untrusted text everywhere it renders + preflight SafetyWarnings
in the confirm modal + a local execution history (audit log)`.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

## `packages/spec` - pure safety core

- [x] `sanitizeText(input, opts?)` - strip control / bidi-override / zero-width
      characters, flag mixed-script (homoglyph) and over-length; returns cleaned
      text + issues
- [x] `writeWarnings(ctx)` - preflight `SafetyWarning[]` from wrong network,
      unverified source, stale manifest and critical risk
- [x] Types: `TextIssue`, `SanitizedText`, `SafetySeverity`, `SafetyWarning`,
      `WriteSafetyContext`

## `packages/components` - presentational

- [x] `SafeText` - renders sanitized text with a ⚠ marker when issues are found
- [x] `SafetyWarnings` - severity-styled warning list
- [x] `AuditLog` - execution-history table (function, status, hash, time) with
      export / clear
- [x] `ConfirmDialog` gains a `warnings` prop (shown before Confirm)
- [x] Apply `SafeText` to untrusted strings (token name/symbol, contract name)

## `packages/renderer` - wiring

- [x] `useConfirm` / `ConfirmMeta` carry `warnings`
- [x] `GeneratedApp` takes an optional `safety` context (`verified`, `stale`);
      `OperationCard` computes per-write warnings (network/verified/stale/risk)
      and feeds them to the confirm modal

## `apps/studio` - audit trail & diagnostics

- [x] `state/history.ts` - per-project execution log in localStorage
      (append / load / clear / export)
- [x] `useContractRuntime` records terminal write results (success/error) via an
      `onWrite` hook
- [x] `ProjectView` shows a History panel and passes the safety context to the
      generated app

## Tests

- [x] `sanitizeText`: strips bidi/zero-width/control, flags mixed-script/length
- [x] `writeWarnings`: wrong network → danger, unverified/stale → warn
- [x] `SafeText`: marks a spoofed string; renders clean text plainly
- [x] `ConfirmDialog`: renders preflight warnings
- [ ] History store round-trip - deferred (studio has no vitest runner yet; logic
      is exercised via typecheck + e2e). Tracked in the backlog.

## Docs & CI

- [x] ADR-008 - untrusted-input safety & local audit trail
- [x] Update `PROGRESS.md`, `docs/roadmap.md`, backlog
- [x] lint / typecheck / test / build / e2e green

## Definition of done

- [x] A token whose name contains a bidi/zero-width spoof renders with a warning
- [x] Confirming a write on the wrong network shows a blocking-severity warning
- [x] Every sent transaction is recorded locally and can be exported/cleared
- [x] All checks green
