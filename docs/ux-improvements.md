# UX improvements

A living, prioritized list of user-experience work for the studio and the
generated apps. It complements the feature [backlog](progress/backlog.md): the
backlog tracks _capabilities_, this doc tracks _how the product feels to use_.
Ordered by impact-to-effort; check items off here when they ship.

## Principles

- **Never surprise the user with a transaction.** Every write states what it
  does, what it costs (risk/permission), and what could go wrong (preflight
  warnings) before it is signed.
- **Destructive and irreversible actions must be deliberate.** Confirmations for
  deletes and critical writes; typed `CONFIRM` for the truly irreversible.
- **Trust is earned visibly.** Show provenance, staleness, and confidence rather
  than hiding uncertainty.
- **Fast first paint, honest empty/loading/error states.** Nothing should feel
  broken while data loads or a chain is unreachable.
- **Accessible by default.** WCAG AA contrast, keyboard paths, and labelled
  controls are requirements, not polish.

## What already works (form UX)

These are implemented in `@semantic-dapp/components` and used by every generated
form, so they need no further work - listed here so the baseline is clear:

- **Per-field validation on submit** (`inputs/encode.ts`): addresses are checksum-
  validated with viem (`isAddress`/`getAddress`), integers parsed as `bigint`
  with sign checks, `bytesN` length-checked, `bool` coerced - each field shows its
  own error and the write is blocked until all inputs encode.
- **Dynamic array inputs** (`InputField` → `ArrayInput`): `type[]` renders an
  editable list with **“+ Add <elem>”** and per-row **Remove**, one item after
  another, for any element type (including nested arrays).
- **Tuple/struct inputs** render their components recursively with labels.
- **Type-aware controls**: numeric keyboards for integers, a checkbox for `bool`,
  and `0x…` placeholders for address/bytes.

## Recently shipped

- **Role picker by name** - the Role manager discovers the contract's role
  constants (`MINTER_ROLE`, `PAUSER_ROLE`, `DEFAULT_ADMIN_ROLE`, …) **from the
  ABI** and offers them in a **dropdown mapped to their bytes32 id**, so you
  grant/revoke a role by name instead of pasting a hash. Values are computed
  locally from the OZ convention (`keccak256(name)`, `DEFAULT_ADMIN_ROLE` =
  `0x00…0`) so the picker works even without a live RPC, then refined with the
  exact on-chain value when a read succeeds. A “Custom…” option keeps raw
  bytes32 / keccak256-name entry for anything not discovered.
- **Role membership badges** - once you enter an account, the manager runs
  `hasRole` for every discovered role and shows which ones it holds (✓/·), then
  **disables no-op actions** (Grant for a role already held, Revoke for one it
  doesn't). Wired in `RoleManagerHost` via `checkMembership`.
- **Inline parameter confirmation (roles)** - the Role manager now validates as
  you type: the Account field shows “✓ Address accepted” with the **checksummed**
  value (accepting any casing) or an inline error; a custom role shows “✓ Valid
  bytes32” or a live **keccak256 preview** when hashing a name; and when a
  contract exposes no role constants, a hint explains manual entry instead of a
  bare hash box.
- **Accessibility gate** - `@axe-core/playwright` fails the build on
  serious/critical violations on the standalone app (User + Raw tabs).
- **WCAG AA contrast** - audience/risk badge text, the connect button
  (`#1d4ed8`), the footer, and filled emergency buttons (`--sd-emergency-fill`)
  now meet 4.5:1.
- **Delete confirmation** - deleting a project opens a high-risk `ConfirmDialog`
  and also clears its local execution history, instead of removing it on one
  click.
- **`initialChain`** - the connect/switch flow defaults to the project's (or
  bundle's) chain, cutting wrong-network prompts.
- **Reads fall back to the wallet** - when the configured HTTP RPC is missing,
  rate-limited, or CORS-blocked (the classic “HTTP request failed” on a read),
  a connected wallet on the contract’s chain is used as a fallback transport, so
  reads keep working. Studio + generated app (`createReadClientFor`).

## Prioritized backlog

### P0 - high impact, low effort

- [ ] **Transaction toasts** - a lightweight, dismissible toast on submitted /
      confirmed / failed, in addition to the inline `TxStatusView`. Today status
      only lives next to the button, so a user who scrolled away misses the
      result. (`components` + `renderer`)
- [ ] **Explorer links everywhere** - link tx hashes and addresses (audit log,
      tx status, overview) to the chain's block explorer. Needs an `explorerUrl`
      threaded into the studio runtime (the resolver already knows it).
- [ ] **Copy-to-clipboard affordances** - one-click copy for addresses, tx
      hashes, and the generated app URL, with a "copied" tick.
- [ ] **Empty/loading/error polish** - skeletons for reads in flight, a clear
      "RPC unreachable" banner (vs. silent empty reads), and a first-run empty
      state that points at "New import". Now that reads fall back to the wallet,
      the banner should distinguish "no RPC and no wallet" from a genuine revert.
- [ ] **Inline validation in the generic form** - bring the Role manager's
      live "✓ accepted / checksummed / preview" feedback to the generic
      `FunctionForm` (per-field, as-you-type) so every parameter is confirmed
      before submit, not only on click. (`components`)

### P1 - high impact, medium effort

- [ ] **Read Data grid** - a dedicated panel that auto-calls no-arg getters
      (name/symbol/decimals/totalSupply/paused/owner…) and shows them as a live
      dashboard, instead of one form per getter. Biggest "it just works" moment
      for the User tab. (backlog: Phase 6)
- [ ] **ERC-4626 vault panel** - deposit/mint/withdraw/redeem with live previews
      (`previewDeposit`/`previewRedeem`) and share/asset balances, replacing the
      generic forms for vaults. Directly improves the vault demo. (backlog: Phase 6)
- [ ] **Amount widgets with decimals** - render `token-amount` inputs with human
      units (respecting `decimals`), a MAX button, and balance hints; wire the
      manifest `InputDefinition` widgets into the generic form. (backlog: Phase 6)
- [ ] **Diagnostics panel** - a green/warn/fail checklist (verified source,
      proxy, staleness, standards confidence, network) beyond the Overview
      summary, so a reviewer can judge trust at a glance. (backlog: Phase 7)
- [ ] **Route-level lazy loading** - `React.lazy` the `ProjectView` (wallet +
      renderer + web3/rainbowkit chunks) so the list view paints fast and the
      heavy chunks load only when a project opens. (backlog: perf)

### P2 - refinements

- [ ] **Simulation-based preflight** - surface revert/gas anomalies, unlimited
      approvals and self-transfers as `SafetyWarning`s in the confirm dialog.
      (backlog: Phase 7)
- [ ] **Manifest editor UX** - inline validation, keyboard save, and a clearer
      diff between analyzed vs. reviewed values.
- [ ] **Wrong-network inline switch** - a one-click "Switch to <chain>" button
      near write actions when connected to the wrong chain.
- [ ] **Import wizard guidance** - inline examples/paste-detection for ABI vs.
      artifact vs. address, and clearer per-field errors.
- [ ] **Theme + density** - light theme and a compact density toggle; respect
      `prefers-reduced-motion` for the modal/overlay transitions.
- [ ] **Keyboard & focus** - focus-trap the modal, return focus to the trigger on
      close, and add visible focus rings across custom controls.
- [ ] **i18n scaffolding** - externalize UI strings so the studio and generated
      apps can be localized.

## Accessibility follow-ups

- [ ] Extend the axe gate to the **Admin/Emergency** tabs and the **studio**
      (currently only User + Raw on the generated app).
- [ ] Audit the ConfirmDialog and ImportWizard for focus-trap and
      `aria-describedby` wiring.
- [ ] Verify all icon-only buttons have accessible names (the delete button
      already uses `aria-label`).

## How this doc is maintained

Add a line under **Recently shipped** and tick the backlog item when a UX change
lands. Keep entries concrete (what the user sees, and where in the code), and
prune anything that graduates into a phase checklist.
