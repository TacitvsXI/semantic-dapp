# Phase 1 - Vertical Slice to v0.0.1

Goal (Execution Plan §17.1): a single end-to-end slice -
**manual ABI → normalized ContractModel → one ERC-20 semantic rule → generated
User/Admin/Raw app → wallet transaction**. Combines Phase 0 (foundation),
Phase 1 (Raw ABI runtime) and the first ERC-20 detector.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

## Phase 0 - Foundation (Day 1)

- [x] GitHub repository `semantic-dapp`
- [x] pnpm workspace + Turborepo
- [x] License chosen: AGPL-3.0-only
- [x] LICENSE, README stub, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY
- [x] TypeScript strict, ESLint, Prettier, commit hooks (husky + lint-staged)
- [x] Node/pnpm version pinning (`.nvmrc`, `packageManager`, `engines`) _(gap-fix)_
- [x] GitHub Actions: install, lint, typecheck, unit test, build
- [x] Issue labels: core, resolver, analyzer, ui, security, docs, good-first-issue
- [x] ADR-001 deterministic-first
- [x] ADR-002 manifest as intermediate representation
- [x] Public roadmap and milestones M1-M5 (`docs/roadmap.md`)

## Phase 1 - Raw ABI runtime

### `packages/spec` (Day 2)

- [x] `ContractModel` and ABI normalization (functions/events/errors/constructor)
- [x] `Audience` and `OperationType` enums
- [x] `Evidence`, `InputDefinition`, `OperationDefinition`
- [x] Minimal `SemanticManifest`
- [x] Zod runtime validation
- [x] JSON Schema export
- [x] Unit tests (20 passing)

### `contracts/fixtures` (Foundry)

- [x] Foundry project with `Counter.sol` and `MockERC20.sol` (7 forge tests passing)
- [x] Deploy script for Anvil (dev/demo + integration tests)

### `packages/execution` (Day 4 part)

- [x] viem public client
- [x] wagmi config with injected connector _(WalletConnect deferred, gap-fix)_
- [x] Read calls + formatted output
- [x] `simulateContract` before write
- [x] Write call, gas estimate, receipt states
- [x] Decode custom errors and revert reasons
- [x] Anvil integration test (deploy/read/write/revert-decode)

### `packages/components` (Days 3-5)

- [x] Input widgets: address, uint/bounded, bool, bytes, tuple, array
- [x] Read result display
- [x] Generic write form (validate + encode, per-field errors)
- [x] Transaction status view
- [x] view/pure vs write separation
- [x] Confidence / risk / audience / evidence badges
- [x] Unit + render tests (15 passing)

### `packages/renderer`

- [x] Route/section generation from manifest → User / Admin / Raw tabs
- [x] Confidence/evidence display (badges + evidence list)
- [x] Runtime bridge interface + per-function tx state
- [x] Lossless Raw tab (all ABI functions) + sensitive-action confirmation
- [x] Unit tests (6 passing)

### `apps/studio` (Day 6)

- [x] Manual ABI import wizard (paste or upload; validates ABI)
- [x] Local project persistence (localStorage) _(gap-fix)_
- [x] Custom RPC + chain ID UI
- [x] Raw read/write interface (renderer + components + execution)
- [x] Injected wallet connect / disconnect

### `packages/analyzer` (Day 7)

- [x] ERC-20 detector (selector set + weighted confidence) with `Evidence`
- [x] Live metadata reader (name/symbol/decimals/totalSupply/balanceOf)
- [x] Canonical ERC-20 function semantics map (for the classifier)
- [x] Unit tests against canonical fixtures (7 passing)

### `packages/components` - ERC-20 semantic (Day 8)

- [x] `TokenTransfer` component (human amount → base units, balance guard)
- [x] `TokenApproval` component (with unlimited-approval risk toggle)
- [x] Token metadata dashboard
- [x] Amount parsing helper + unit/render tests

### `packages/classifier` (Day 9)

- [x] `transfer/approve → audience` rules (+ mint/burn/transferFrom)
- [x] Confidence score + thresholds (from standard detection)
- [x] Raw fallback for unknown functions (developer / raw-only)
- [x] Manual review actions surface (confirm / move-to-raw / set-audience) in manifest
- [x] Studio integration: tabs populate; semantic Token panel in User tab
- [x] Unit tests (8 passing)

### Tests & CI

- [x] Vitest unit (spec / analyzer / classifier / execution / components / renderer)
- [x] Integration against Anvil (read/write ERC-20)
- [x] Minimal Playwright smoke (import → tabs)
- [x] Green CI locally (build / lint / typecheck / test / integration / e2e); GitHub Actions configured

## Definition of Done (Execution Plan §11.3 / §16.1)

- [x] Public repo with green CI (GitHub Actions configured; all tasks green locally)
- [x] Manual ABI import
- [x] Working raw read/write interface
- [x] First ERC-20 semantic detector
- [x] User/Admin/Raw tabs with confidence/evidence
- [x] Wallet transaction against Anvil (covered by execution integration test; UI path documented in `docs/demo.md`)
- [x] Unit tests + Foundry fixtures
- [x] Demo screenshots (`docs/demo/`); short GIF is an optional manual capture - see `docs/demo.md`
- [x] Clear backlog for the next 8-10 weeks (`docs/progress/backlog.md`)
- [ ] `v0.0.1` tag - release action, run when ready: `git tag v0.0.1` (not created automatically)

## Test summary

| Suite                         | Count | Command                                                   |
| ----------------------------- | ----- | --------------------------------------------------------- |
| spec                          | 20    | `pnpm --filter @semantic-dapp/spec test`                  |
| execution (unit)              | 10    | `pnpm --filter @semantic-dapp/execution test`             |
| execution (Anvil integration) | 3     | `pnpm --filter @semantic-dapp/execution test:integration` |
| components                    | 22    | `pnpm --filter @semantic-dapp/components test`            |
| renderer                      | 6     | `pnpm --filter @semantic-dapp/renderer test`              |
| analyzer                      | 7     | `pnpm --filter @semantic-dapp/analyzer test`              |
| classifier                    | 8     | `pnpm --filter @semantic-dapp/classifier test`            |
| Foundry fixtures              | 7     | `cd contracts/fixtures && forge test`                     |
| studio e2e (Playwright)       | 1     | `pnpm --filter @semantic-dapp/studio test:e2e`            |
