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

## Recently shipped

- **Accessibility gate** — `@axe-core/playwright` fails the build on
  serious/critical violations on the standalone app (User + Raw tabs).
- **WCAG AA contrast** — audience/risk badge text, the connect button
  (`#1d4ed8`), the footer, and filled emergency buttons (`--sd-emergency-fill`)
  now meet 4.5:1.
- **Delete confirmation** — deleting a project opens a high-risk `ConfirmDialog`
  and also clears its local execution history, instead of removing it on one
  click.
- **`initialChain`** — the connect/switch flow defaults to the project's (or
  bundle's) chain, cutting wrong-network prompts.

## Prioritized backlog

### P0 — high impact, low effort

- [ ] **Transaction toasts** — a lightweight, dismissible toast on submitted /
      confirmed / failed, in addition to the inline `TxStatusView`. Today status
      only lives next to the button, so a user who scrolled away misses the
      result. (`components` + `renderer`)
- [ ] **Explorer links everywhere** — link tx hashes and addresses (audit log,
      tx status, overview) to the chain's block explorer. Needs an `explorerUrl`
      threaded into the studio runtime (the resolver already knows it).
- [ ] **Copy-to-clipboard affordances** — one-click copy for addresses, tx
      hashes, and the generated app URL, with a "copied" tick.
- [ ] **Empty/loading/error polish** — skeletons for reads in flight, a clear
      "RPC unreachable" banner (vs. silent empty reads), and a first-run empty
      state that points at "New import".

### P1 — high impact, medium effort

- [ ] **Read Data grid** — a dedicated panel that auto-calls no-arg getters
      (name/symbol/decimals/totalSupply/paused/owner…) and shows them as a live
      dashboard, instead of one form per getter. Biggest "it just works" moment
      for the User tab. (backlog: Phase 6)
- [ ] **ERC-4626 vault panel** — deposit/mint/withdraw/redeem with live previews
      (`previewDeposit`/`previewRedeem`) and share/asset balances, replacing the
      generic forms for vaults. Directly improves the vault demo. (backlog: Phase 6)
- [ ] **Amount widgets with decimals** — render `token-amount` inputs with human
      units (respecting `decimals`), a MAX button, and balance hints; wire the
      manifest `InputDefinition` widgets into the generic form. (backlog: Phase 6)
- [ ] **Diagnostics panel** — a green/warn/fail checklist (verified source,
      proxy, staleness, standards confidence, network) beyond the Overview
      summary, so a reviewer can judge trust at a glance. (backlog: Phase 7)
- [ ] **Route-level lazy loading** — `React.lazy` the `ProjectView` (wallet +
      renderer + web3/rainbowkit chunks) so the list view paints fast and the
      heavy chunks load only when a project opens. (backlog: perf)

### P2 — refinements

- [ ] **Simulation-based preflight** — surface revert/gas anomalies, unlimited
      approvals and self-transfers as `SafetyWarning`s in the confirm dialog.
      (backlog: Phase 7)
- [ ] **Manifest editor UX** — inline validation, keyboard save, and a clearer
      diff between analyzed vs. reviewed values.
- [ ] **Wrong-network inline switch** — a one-click "Switch to <chain>" button
      near write actions when connected to the wrong chain.
- [ ] **Import wizard guidance** — inline examples/paste-detection for ABI vs.
      artifact vs. address, and clearer per-field errors.
- [ ] **Theme + density** — light theme and a compact density toggle; respect
      `prefers-reduced-motion` for the modal/overlay transitions.
- [ ] **Keyboard & focus** — focus-trap the modal, return focus to the trigger on
      close, and add visible focus rings across custom controls.
- [ ] **i18n scaffolding** — externalize UI strings so the studio and generated
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
