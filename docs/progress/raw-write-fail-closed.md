# Raw writes fail-closed

> **Status:** Phase 1–2 done · Phase 3 planned

> **Origin:** r/ethdev feedback ([thread](https://www.reddit.com/r/ethdev/comments/1v6zlzr/i_got_tired_of_rebuilding_contract_admin_uis_so_i/)) — u/Specific-Sector7422  
> **North star fit:** self-custody + custody trust — the fallback path must be _more_ conservative than the classified path, not less.

## Problem (confirmed in code)

| Path                       | Today                                                         |
| -------------------------- | ------------------------------------------------------------- |
| `OperationCard` (semantic) | Confirm when `high`/`critical` / privileged / safety warnings |
| `RawFunctionCard`          | `FunctionRunner` with **no** `confirm` and **no** `safety`    |
| Preview                    | Optional; stale preview can remain after form changes         |

Unclassified / Raw writes are the _highest_ semantic uncertainty — and currently the _least_ gated. README claim (“falls back to Raw with a warning”) oversells what the UI does.

## Principles

1. **Uncertainty ⇒ stricter gates** (Raw ≥ classified admin).
2. **Reads stay free** — gates apply only to writes.
3. Ship **UX gates first**; full execution envelope as a follow-up.
4. Deterministic, no new network deps for the gate itself.

---

## Phase 1 — Fail-closed Raw confirm (P0)

- [x] Pass `safety?: SafetyContext` into `RawFunctionCard` (from `GeneratedApp` / studio).
- [x] Every **raw write** builds confirm via `rawWriteWarnings` + explicit warning:
      _“Unclassified / Raw — highest uncertainty.”_
- [x] Default raw-write risk floor: at least `high`; **typed `CONFIRM` for all raw writes**
      (stricter than semantic `high`, which only types on `critical`).
- [x] Short banner above Raw → Write group explaining the gate.
- [x] Tests: raw write cannot submit without confirm; unclassified warning present.
- [x] README: align “Raw fallback” wording with fail-closed behavior.

**Touch:** `packages/renderer/src/OperationCard.tsx` (`RawFunctionCard`),
`GeneratedApp.tsx`, `packages/spec/src/safety.ts` (helper), `ConfirmDialog` /
`useConfirm` if typed-CONFIRM policy needs a flag, tests, `README.md`.

**Done when:** one-click Raw Submit without modal (+ typed CONFIRM) is impossible.

---

## Phase 2 — Mandatory preview + invalidation (P0/P1)

- [x] Raw writes: Submit disabled until a **successful** preview matches current args.
- [x] Preview fingerprint: args + value + chainId + account + target + function.
- [x] Clear preview on form / network / account change (no stale panel).
- [x] Submit rejects if fingerprint ≠ current; force Preview again.
- [x] Copy: “Preview required before send” on raw writes.
- [x] Tests for invalidate-on-edit and submit-without-fresh-preview.

**Touch:** `FunctionRunner.tsx`, tests; optionally same rule for semantic high/critical.

**Done when:** changing an amount after Preview clears it and blocks Submit.

---

## Phase 3 — Execution envelope (P1, separate PR + short ADR)

After successful preview, bind an envelope and only allow submit if it still matches:

- `chainId`, `account`, `to`, `value`, `calldata` (+ hash)
- `abiHash` / `manifestHash` when available
- proxy `implementation` / diamond facet-set or `codeHash`
- `simulationBlock` when RPC provides it

Any drift ⇒ invalidate preview / block send.

**Done when:** network or implementation change invalidates a prior preview envelope.

---

## Out of scope (for this track)

- Auto-promoting Raw functions into Admin via better classification.
- On-chain attestations.
- Extra friction on already-classified User-tab flows (e.g. ERC-20 transfer).

---

## Suggested Reddit reply (after Phase 1 ships, or when starting)

> You’re right that Raw was under-protected relative to classified admin writes.
> We’re making Raw fail closed (confirm + typed CONFIRM; then mandatory preview /
> invalidation; execution envelope next). Thanks for the concrete review.

## Log

- 2026-07-26: **Phase 2 shipped** — Raw writes require successful Preview; fingerprint binds
  args/chain/account/target; form + wallet/target drift clears preview; Submit blocked until
  match. `buildPreviewFingerprint` + `requirePreview` on `FunctionRunner`.
- 2026-07-26: **Phase 1 shipped** — `RawFunctionCard` fail-closed confirm + typed CONFIRM;
  `rawWriteWarnings`; Raw write banner; README aligned; tests in `RawFunctionCard.test.tsx` /
  `ConfirmDialog` / `safety`.
- 2026-07-26: Plan captured from r/ethdev review; linked from universal-hardening backlog.
