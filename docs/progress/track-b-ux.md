# Track B - "It just works" UX (post-beta)

Adoption-focused UX polish shipped after `v0.1.0-beta`. Goal: make the live demo
and the generated apps feel effortless at first glance. Tracked in
[`docs/ux-improvements.md`](../ux-improvements.md).

## Scope

A batch of four tightly-related improvements that share plumbing (a chain
registry, a copy affordance, a toast store):

- [x] **Known-chain registry** (`packages/execution/known-chains.ts`) - maps a
      chain id to its name, native currency and block-explorer base URL for the
      common EVM chains; `explorerUrlForChain` / `txUrl` / `addressUrl` helpers.
      `defineChainFromConfig` now fills name/currency/explorer from it.
- [x] **Explorer links** - `explorerUrl` threaded into the studio and
      generated-app runtimes; tx hashes (tx status + audit log) and the contract
      address (overview + studio header) link out to the explorer.
- [x] **Copy-to-clipboard** - reusable `CopyButton` (transient ✓, legacy
      fallback) and `AddressView` (shortened, linkable, copyable address); used
      in overview, studio header and read values.
- [x] **Transaction toasts** - shared `pushToast` store + `ToastViewport` mounted
      in both apps; runtimes emit submitted → confirmed/failed (upgraded in place)
      with an explorer link.
- [x] **Read data grid** - `ReadDataGrid` auto-calls every no-argument getter in
      parallel and renders a live dashboard with per-cell skeletons, error+retry
      and "Refresh all"; parametrized reads stay as forms.

## Tests

- [x] `packages/execution/known-chains.test.ts` - explorer/tx/address URLs, name
      fallback, native currency.
- [x] `packages/components/toast-store.test.ts` - push/replace-by-id/dismiss/
      subscribe + error-vs-info duration.
- [x] `packages/components/AddressView.test.tsx` - shorten, explorer link,
      copy-button presence/absence.
- [x] `packages/renderer/ReadDataGrid.test.tsx` - `noArgReads` selection,
      auto-call + render, per-cell failure, empty (renders nothing).

## Gates

- [x] `pnpm build` (all 11 packages/apps)
- [x] `pnpm typecheck` (19 tasks)
- [x] `pnpm lint` (19 tasks)
- [x] `pnpm test` (17 tasks)

## Follow-ups (not in this track)

- "RPC unreachable" banner distinct from a genuine revert (P0 empty/error).
- Inline as-you-type validation in the generic `FunctionForm` (P0).
- ERC-4626 vault panel with previews; amount widgets with decimals (P1).
