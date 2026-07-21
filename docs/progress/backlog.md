# Backlog (Phases 2+)

Captured while building the Phase 1 vertical slice. Ordered roughly by the
roadmap. Each becomes a GitHub issue with the matching label. UX-specific
polish (toasts, explorer links, read grid, vault panel, …) is tracked and
prioritized in [`docs/ux-improvements.md`](../ux-improvements.md).

## Post-v0.0.1 polish (delivered)

- [x] Vite `manualChunks` code-splitting (react / web3 / rainbowkit vendors)
- [x] Editable connection settings (address / chain / RPC) after import
- [x] Export semantic manifest as JSON (client-side download)
- [x] "Tech stack & rationale" section in the roadmap
- [x] Wallet connector aggregator: RainbowKit over wagmi. Injected-only by
      default (no secret needed); set `VITE_WALLETCONNECT_PROJECT_ID` to enable
      the full wallet list + WalletConnect QR. `ConnectButton` also handles
      account display and wrong-network switching.

## Deferred minor improvements (keep in mind)

Small, non-blocking enhancements intentionally deferred so we can start Phase 2.
Pick these up between phases or when they naturally fold into a larger workstream.

- [x] **Import manifest JSON** - round-trip with Export; loads a previously
      exported/edited manifest via `migrateManifest` (delivered in Phase 3).
- [ ] **Full re-resolution after upgrade** - when a manifest is stale, re-fetch a
      fresh ABI via the Phase 2 resolver (today Re-analyze refreshes
      classification + code hash on the current ABI only).
- [ ] **Route-level lazy loading** - `React.lazy` the `ProjectView` (wallet +
      renderer stack) so the initial load ships mostly app code; the heavy
      web3/rainbowkit chunks load when a project is opened.
- [ ] **Empty `react` vendor chunk** - the manualChunks split emits a 0 KB
      `react` chunk; refine the split (function form) so React lands in its own
      cacheable chunk.
- [x] **RainbowKit `initialChain`** - connect/switch flow now defaults to the
      project's / bundle's chain in both apps to reduce wrong-network prompts.
- [ ] **Unit tests for studio utilities** - cover `lib/download.ts` and the
      `SettingsPanel` validation logic (currently only e2e-smoke touches them).
- [x] **Project delete confirmation** - deleting a project opens a high-risk
      `ConfirmDialog` and clears its local execution history (no one-click loss).
- [x] **Tx notifications** - dismissible toasts on submitted/confirmed/failed
      (shared `pushToast` store + `ToastViewport`, emitted from both runtimes) in
      addition to the inline `TxStatusView`, with an explorer link.
- [x] **A11y pass** - `@axe-core/playwright` gate on the standalone app (User +
      Raw tabs, no serious/critical violations); raised badge/button text contrast
      to WCAG AA (Phase 9).

## Phase 2 - Address resolver (`resolver`)

- Adapter interface for ABI/source providers
- Generic block-explorer API adapter
- Sourcify adapter
- EIP-1967 implementation-slot detection; Transparent vs UUPS
- Store proxy address, implementation address, code hash
- Show ABI/source provenance and confidence
- Fallback when ABI is not found

## Phase 3 - Semantic manifest (`spec` + `studio`) - done (slice)

- [x] Manifest editor with form and raw JSON tabs
- [x] Import/export manifest round-trip
- [x] Migration framework (`spec/migrations`)
- [x] Stale detection by implementation code hash
- [ ] YAML tab (JSON only for now)

## Phase 4 - Standards analyzer (`analyzer`) - done (slice)

- [x] Generic member-based detection engine (`detectByMembers`) + registry
- [x] ERC-721, ERC-1155, ERC-4626 detectors + semantics
- [x] Ownable, AccessControl (role model), Pausable
- [x] UUPS / upgrade function detector
- [x] Access model (`ownable` / `access-control`) → operation permissions
- [x] Unit tests against canonical ABIs + classifier routing tests
- [ ] Runtime ERC-165 `supportsInterface` cross-check (interface IDs currently
      recorded as evidence only, detection is ABI-shape based)
- [ ] More extensions: ERC-2612 permit, ERC-777, ERC-20 votes/snapshot

## Phase 5 - Classification (`classifier`) - done (slice)

- [x] Priority-based rule engine (`engine.ts`) with field-level resolution +
      evidence accumulation
- [x] Name heuristics (mint/burn/pause/withdraw/rescue/set·update/claim/deposit)
- [x] Risk heuristics (destructive/dangerous names, payable)
- [x] Read promotion (view/pure → Read tab)
- [x] Permissions attached from the access model post-resolution
- [ ] Confidence calibration from corroborating evidence (currently primary-rule
      confidence only)
- [ ] Per-project custom rule overrides / user-tunable priorities
- [ ] NatSpec- and source-AST-based evidence (still name/signature only)

## Phase 6 - Generated UI (`renderer` + `components`) - done (slice)

- [x] Overview panel (identity, standards chips, section counts, confidence)
- [x] PausePanel + RoleManager consoles (grouped by operationType)
- [x] ConfirmDialog critical-action flow (typed CONFIRM for critical)
- [x] De-duplicated ERC-20 transfer/approve on the User tab
- [ ] Mint/Burn panel (generic form + confirm covers it functionally)
- [ ] Vault (ERC-4626) deposit/withdraw/redeem panel with previews
- [x] Dedicated Read Data grid with auto-called no-arg getters (`ReadDataGrid`)
- [ ] Wire manifest `InputDefinition` widgets (token-amount/token-id) into the
      generic form (currently ABI-type based, specialized panels handle amounts)

## Phase 7 - Safety & diagnostics - done (slice)

- [x] Untrusted-text sanitization (`sanitizeText` + `SafeText`): strips
      bidi/zero-width/control chars, flags mixed-script homoglyphs and length
- [x] Preflight `writeWarnings` (wrong network, unverified source, stale
      manifest, critical risk) surfaced in the ConfirmDialog
- [x] Applied `SafeText` to token name/symbol and contract name
- [x] Local execution history (audit trail) with export/clear in the studio
- [ ] History store unit test - studio lacks a vitest runner; add jsdom+vitest to
      the studio and cover `state/history.ts` and `lib/download.ts`
- [ ] NatSpec/metadata sanitization at **import** time (sanitize titles/
      descriptions into the manifest, not just at render)
- [ ] Diagnostics panel with a green/warn/fail checklist (verified, proxy,
      staleness, standards confidence, network) beyond the Overview summary
- [ ] Simulation-based preflight warnings (revert/gas anomalies, unlimited
      approval, self-transfer) feeding the same `SafetyWarning` type
- [x] Explorer links in the audit log + tx status + overview/header (known-chain
      registry `explorerUrlForChain`, threaded into both runtimes)

## Phase 8 - Export & CLI (`export`, `cli`) - done (slice)

- [x] Portable `SemanticBundle` (identity + ABI + manifest) with zod validation
- [x] `generated-app` template renders a bundle at runtime (analyzer-free)
- [x] Studio "Export app" button
- [x] `semantic-dapp bundle | export | serve` CLI (+ `import` alias)
- [x] Static-hosting friendly (SPA fallback serve; any static host works)
- [ ] CLI address-based `import` (resolver-backed) - today `bundle` takes an ABI
      file; the studio already resolves by address
- [ ] Publish `@semantic-dapp/*` to npm for a true `npx semantic-dapp` and a
      standalone `pnpm install` outside the monorepo
- [ ] Extract a shared `app-kit` (wallet providers + runtime hook) so the studio
      and template stop duplicating wiring
- [ ] `export` that emits a prebuilt static `dist` (not just source) for
      zero-toolchain hosting

## Phase 9 - Fixtures, docs & public beta - done (slice)

- [x] `MockVault` (ERC-4626) + `MockRWA` (roles + pause) Foundry fixtures + tests
- [x] Real compiled ABIs (`contracts/fixtures/abi`) drive analyzer/classifier tests
- [x] Three demo bundles (ERC-20, vault, RWA) + `docs/demos.md`
- [x] Accessibility gate (`@axe-core/playwright`) + contrast fixes
- [x] CI: forge fixtures job (+ ABI drift check) and generated-app e2e
- [x] `v0.1.0-beta` version bump + `CHANGELOG.md` + README beta status
- [x] Emergency/write **button** white-on-color contrast - filled emergency
      buttons use a darker `--sd-emergency-fill` (#b3261e) so white text clears AA
- [x] Dependency/security review + Dependabot before tagging `v0.1.0` - audit
      triaged, transitive `axios`/`ws`/`uuid` pinned via pnpm overrides (audit
      clean), Dependabot + CodeQL + audit/dependency-review CI added (Track A,
      [checklist](track-a-hardening.md))
- [~] Fund the demos against a public testnet so writes work without local Anvil - deploy flow + verification documented (`docs/demos.md`); the actual
  funded deployment is a manual maintainer step
- [ ] Screenshots/GIFs of the vault and RWA demos in `docs/demos.md`
