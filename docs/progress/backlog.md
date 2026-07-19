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

- [ ] **Import manifest JSON** — round-trip with the existing Export button; load
      a previously exported/edited manifest into a project. Folds into the
      Phase 3 manifest editor.
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

## Phase 3 — Semantic manifest (`spec` + `studio`)

- Manifest editor with form and raw YAML/JSON tabs
- Import/export manifest round-trip
- Migration framework (`spec/migrations`)
- Stale detection by implementation code hash

## Phase 4 — Standards analyzer (`analyzer`)

- ERC-165 / selector-set utilities
- ERC-721, ERC-1155, ERC-4626 detectors (incl. preview methods)
- Ownable, AccessControl (role model), Pausable
- UUPS / upgrade function detector
- Unit tests against canonical OpenZeppelin fixtures

## Phase 5 — Classification (`classifier`)

- Full `OperationType` coverage; deposit/withdraw/redeem, grant/revoke/renounce
- pause/unpause; upgrade/ownership as critical
- Rule engine with priorities

## Phase 6 — Generated UI (`renderer` + `components`)

- Overview dashboard, Read Data section, Emergency section
- Mint/Burn, Vault, RoleManager, PausePanel components
- Critical action confirmation flows

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
