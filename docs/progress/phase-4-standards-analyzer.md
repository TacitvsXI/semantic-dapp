# Phase 4 — Standards Analyzer

Goal (Execution Plan §17.4): recognize the common EVM standards and access models
beyond ERC-20, so real contracts (NFTs, vaults, role-gated admin, pausable,
upgradeable) generate meaningful User/Admin/Emergency UIs automatically.

Slice: `generic member-based detector → ERC-721/1155/4626 + Ownable/
AccessControl/Pausable/Upgradeable → merged semantics + access model → classifier
routes each function with permission + risk`.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

## `packages/analyzer`

### Detection engine

- [x] Generic `detectByMembers(model, spec)` (required/optional members, core
      set, threshold, optional ERC-20 prerequisite) → `StandardDetection`
- [x] `StandardDetector` interface (`id`, `detect`, `semantics`)
- [x] `ResolvedSemantic` (semantic + source standard + confidence)
- [x] Registry: `detectStandards(model)`, `resolveSemantics(model)` (merge
      semantics of detected standards, first-wins priority)

### Token standards

- [x] ERC-721 (core + metadata `tokenURI` + enumerable), disambiguated from
      ERC-20 via `ownerOf`/`setApprovalForAll`
- [x] ERC-1155 (`balanceOfBatch`, `safeBatchTransferFrom`, `uri`)
- [x] ERC-4626 vault (asset/totalAssets/convert/deposit/mint/withdraw/redeem),
      requires ERC-20 share token

### Access models & capabilities

- [x] Ownable (`owner`, `transferOwnership`, `renounceOwnership`)
- [x] AccessControl (`hasRole`, `getRoleAdmin`, grant/revoke/renounce role)
- [x] Pausable (`paused`, `pause`, `unpause`)
- [x] Upgradeable / UUPS (`upgradeTo`, `upgradeToAndCall`, `proxiableUUID`)
- [x] `detectAccessModel(model)` → `ownable` | `access-control` | `none`

### Semantics

- [x] Function semantics for the write paths of each standard (audience, type,
      risk): NFT transfer/approve, vault deposit/withdraw/mint/redeem, role
      grant/revoke/renounce, pause/unpause, ownership-transfer, upgrade

## `packages/classifier`

- [x] `classifyFunction` uses merged `resolveSemantics` (not just ERC-20)
- [x] Attach `permission` to privileged operations from the access model
- [x] `classifyContract` returns all detected standards
- [x] Confidence per operation comes from its source standard

## Tests

- [x] Detector unit tests on canonical ABIs (721/1155/4626)
- [x] Capability tests (ownable/access-control/pausable/upgradeable)
- [x] `detectAccessModel` tests
- [x] Classifier routing: role-grant→admin, pause→emergency, upgrade→critical,
      NFT `safeTransferFrom`→user, vault `deposit`→user

## Docs & CI

- [x] ADR-005 — standards detection engine & access model
- [x] Update `PROGRESS.md`, `docs/roadmap.md`, backlog
- [x] Keep lint/typecheck/test/build/e2e green

## Definition of done

- [x] An ERC-721 ABI generates NFT transfer/approve operations
- [x] An AccessControl+Pausable admin contract routes roles to Admin and
      pause/unpause to Emergency, with permissions attached
- [x] An ERC-4626 vault exposes deposit/withdraw/redeem as user operations
- [x] Upgrade functions are flagged critical; all checks green
