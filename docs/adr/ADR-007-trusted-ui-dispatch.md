# ADR-007: operationType → component dispatch & confirmation flow

- Status: Accepted
- Date: 2026-07-19

## Context

Until Phase 6 the renderer showed one generic `FunctionForm` per operation, with
a single special case (`TokenActions`) bolted onto the User tab. This under-uses
the rich classification from Phases 4-5: an admin contract with roles and a pause
switch rendered as a pile of identical forms, and "sensitive action" was only a
checkbox. We want purpose-built, grouped consoles and a real confirmation gate,
without coupling the renderer to any specific chain call (the `ContractRuntime`
boundary from Phase 1 must stay intact) and without losing lossless Raw access.

## Decision

- **Presentational components live in `packages/components`** (pure, runtime-free):
  `ConfirmDialog`, `PausePanel`, `RoleManager`, `OverviewPanel`. They take plain
  props and callbacks - no wallet/RPC knowledge - so they are trivially testable
  and reusable by exported apps.
- **Wiring lives in `packages/renderer`**, following the existing `TokenActions`
  pattern: host components adapt a `ContractRuntime` to the presentational props.
- **Dispatch by grouping, not per-card switching.** Within an audience section,
  operations are grouped: `pause`/`unpause` → one `PausePanel`,
  `role-grant`/`role-revoke`/`role-renounce` → one `RoleManager`; everything else
  falls through to the generic `OperationCard`. Grouping (vs. a per-operation
  `switch`) is what turns scattered functions into a coherent console, and new
  groups are additive.
- **Confirmation is a promise-based hook** (`useConfirm`) backed by a single
  `ConfirmDialog`. A write is gated when its risk is `high`/`critical` **or** it
  carries a privileged `permission`. Critical actions require typing `CONFIRM`.
  The dialog surfaces risk, permission and the exact call being made.
- **No duplicate UI.** When the ERC-20 `TokenActions` panel renders
  transfer/approve, those operations are removed from the generic User cards.

## Consequences

- Admin/emergency contracts now generate real consoles; critical actions are hard
  to fire by accident.
- The renderer still speaks only `ContractRuntime`; components stay pure, so both
  are unit-testable (jsdom) without a wallet.
- Adding Mint/Burn and Vault (ERC-4626) panels later is a components + one host +
  one group entry - no engine or classifier change. Tracked in the backlog.
- Grouping is driven by `operationType`, which the classifier already assigns, so
  the UI improves automatically as classification does.
