# Phase 6 — Trusted UI Components

Goal (Execution Plan §17.6): render the semantics from Phases 4–5 as **trusted,
purpose-built UI** — an overview, grouped admin/emergency consoles, and an
explicit **confirmation flow for critical actions** — instead of one generic form
per function. Standards and heuristics decide _what_ an action is; Phase 6 decides
_how it is presented safely_.

Slice: `operationType → component dispatch (grouped panels) + a reusable
ConfirmDialog gating high/critical/privileged writes + an Overview summary`.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

## `packages/components` — presentational

- [x] `ConfirmDialog` — accessible modal (role=dialog, Esc/backdrop cancel) that
      shows risk, permission, signature and an argument summary; critical actions
      require typing `CONFIRM`
- [x] `PausePanel` — status pill (paused/active/unknown) + Pause/Unpause actions
- [x] `RoleManager` — grant/revoke/renounce with role (known-role presets +
      bytes32) and account validation
- [x] `OverviewPanel` — contract identity, detected standards chips, network/
      wallet status, confidence summary
- [x] Styles for modal + panels (`sd-modal`, `sd-pause`, `sd-roles`, `sd-overview`)

## `packages/renderer` — wiring & dispatch

- [x] `useConfirm()` hook — promise-based confirmation backed by `ConfirmDialog`
- [x] `OperationRenderer` / grouping: pause+unpause → one `PausePanel`,
      role-\* → one `RoleManager`; everything else → `OperationCard`
- [x] Integrate `ConfirmDialog` into `FunctionRunner` (replace the checkbox);
      trigger on high/critical risk **or** a privileged permission
- [x] Overview panel above the tabs
- [x] De-duplicate ERC-20: when `TokenActions` renders transfer/approve, hide the
      duplicate generic cards on the User tab

## Tests

- [x] `ConfirmDialog`: blocks until confirmed; critical requires typed word
- [x] `PausePanel`: renders status, fires pause/unpause
- [x] `RoleManager`: validates role/account, fires grant/revoke/renounce
- [x] Grouping: a manifest with pause+unpause+roles yields one PausePanel and one
      RoleManager (not N cards)
- [x] Regression: `buildSections` and existing component tests still pass

## Docs & CI

- [x] ADR-007 — operationType→component dispatch & confirmation flow
- [x] Update `PROGRESS.md`, `docs/roadmap.md`, backlog
- [x] lint / typecheck / test / build / e2e green

## Definition of done

- [x] An AccessControl+Pausable admin contract shows a single Role manager and a
      Pause console, with a confirmation modal on every privileged action
- [x] Critical actions (upgrade/renounce) cannot be sent without explicit confirm
- [x] ERC-20 transfer/approve are not duplicated on the User tab
- [x] All checks green
