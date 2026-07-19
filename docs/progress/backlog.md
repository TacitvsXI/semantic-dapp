# Backlog (Phases 2+)

Captured while building the Phase 1 vertical slice. Ordered roughly by the
roadmap. Each becomes a GitHub issue with the matching label.

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
