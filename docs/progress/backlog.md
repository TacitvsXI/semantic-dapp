# Backlog (Phases 2+)

Captured while building the Phase 1 vertical slice. Ordered roughly by the
roadmap. Each becomes a GitHub issue with the matching label.

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

- [x] **Import manifest JSON** — round-trip with Export; loads a previously
      exported/edited manifest via `migrateManifest` (delivered in Phase 3).
- [ ] **Full re-resolution after upgrade** — when a manifest is stale, re-fetch a
      fresh ABI via the Phase 2 resolver (today Re-analyze refreshes
      classification + code hash on the current ABI only).
- [ ] **Route-level lazy loading** — `React.lazy` the `ProjectView` (wallet +
      renderer stack) so the initial load ships mostly app code; the heavy
      web3/rainbowkit chunks load when a project is opened.
- [ ] **Empty `react` vendor chunk** — the manualChunks split emits a 0 KB
      `react` chunk; refine the split (function form) so React lands in its own
      cacheable chunk.
- [ ] **RainbowKit `initialChain`** — default the connect modal to the project's
      configured chain to reduce wrong-network prompts.
- [ ] **Unit tests for studio utilities** — cover `lib/download.ts` and the
      `SettingsPanel` validation logic (currently only e2e-smoke touches them).
- [ ] **Project delete confirmation** — guard against accidental loss of a
      locally-stored project.
- [ ] **Tx notifications** — lightweight toast on success/error in addition to
      the inline `TxStatusView`.
- [ ] **A11y pass** — labels/aria on generated forms and the tab bar.

## Phase 2 — Address resolver (`resolver`)

- Adapter interface for ABI/source providers
- Generic block-explorer API adapter
- Sourcify adapter
- EIP-1967 implementation-slot detection; Transparent vs UUPS
- Store proxy address, implementation address, code hash
- Show ABI/source provenance and confidence
- Fallback when ABI is not found

## Phase 3 — Semantic manifest (`spec` + `studio`) — done (slice)

- [x] Manifest editor with form and raw JSON tabs
- [x] Import/export manifest round-trip
- [x] Migration framework (`spec/migrations`)
- [x] Stale detection by implementation code hash
- [ ] YAML tab (JSON only for now)

## Phase 4 — Standards analyzer (`analyzer`) — done (slice)

- [x] Generic member-based detection engine (`detectByMembers`) + registry
- [x] ERC-721, ERC-1155, ERC-4626 detectors + semantics
- [x] Ownable, AccessControl (role model), Pausable
- [x] UUPS / upgrade function detector
- [x] Access model (`ownable` / `access-control`) → operation permissions
- [x] Unit tests against canonical ABIs + classifier routing tests
- [ ] Runtime ERC-165 `supportsInterface` cross-check (interface IDs currently
      recorded as evidence only, detection is ABI-shape based)
- [ ] More extensions: ERC-2612 permit, ERC-777, ERC-20 votes/snapshot

## Phase 5 — Classification (`classifier`) — done (slice)

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

## Phase 6 — Generated UI (`renderer` + `components`) — done (slice)

- [x] Overview panel (identity, standards chips, section counts, confidence)
- [x] PausePanel + RoleManager consoles (grouped by operationType)
- [x] ConfirmDialog critical-action flow (typed CONFIRM for critical)
- [x] De-duplicated ERC-20 transfer/approve on the User tab
- [ ] Mint/Burn panel (generic form + confirm covers it functionally)
- [ ] Vault (ERC-4626) deposit/withdraw/redeem panel with previews
- [ ] Dedicated Read Data grid with auto-called no-arg getters
- [ ] Wire manifest `InputDefinition` widgets (token-amount/token-id) into the
      generic form (currently ABI-type based, specialized panels handle amounts)

## Phase 7 — Safety & diagnostics

- Connected-chain check; code-hash-mismatch warning
- Risk badges and explanations
- NatSpec/metadata sanitization
- Audit-style local execution history

## Phase 8 — Export & CLI (`export`, `cli`)

- `generated-app` template; inject manifest on export
- `npx semantic-dapp import | serve | export`
- Static-hosting deployment verification

## Phase 9 — Public beta

- ERC-20, ERC-4626 vault, RWA-style (roles + pause) demos
- Accessibility audit; dependency/security review
- `v0.1.0-beta` release
