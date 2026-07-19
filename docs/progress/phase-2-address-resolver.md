# Phase 2 - Address Resolver

Goal (Execution Plan §17.2): deliver the project's core promise - **a dApp from
any contract address**. Instead of pasting an ABI by hand, the user enters an
address + chain and the studio resolves the ABI/source, detects proxies, and
records provenance + confidence before generating the UI.

Slice: `address + chainId → resolver (Sourcify / block-explorer) → proxy
detection (EIP-1967) → ABI + provenance → existing normalize → classify →
generated app`.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

## `packages/resolver`

### Types & interfaces

- [x] `AbiSourceAdapter` interface (`id`, `name`, `fetchContract(query)`)
- [x] `ResolvedContract` (abi, sources?, contractName?, compiler?, provenance,
      confidence, proxy?, codeHash?)
- [x] `Provenance` (source id, source name, url, verified flag, matchType,
      retrievedAt)
- [x] `ProxyInfo` (isProxy, kind: `eip1967-transparent` | `eip1967-uups` |
      `eip1967-beacon` | `unknown`, implementation, admin?, beacon?)
- [x] Confidence scoring for source trust (verified full > partial > unverified)

### Adapters

- [x] **Sourcify** adapter - no API key; check `full_match` then `partial_match`,
      read `metadata.json` → ABI + compiler + contract name; set verified flag
- [x] **Block-explorer** adapter - Etherscan v2 unified endpoint
      (`api.etherscan.io/v2/api?chainid=…&module=contract&action=getsourcecode`);
      API key optional (rate-limited without); parse ABI + proxy hints
- [x] Graceful per-adapter failure (network/404/not-verified) → typed result

### Proxy detection

- [x] Read EIP-1967 implementation slot, beacon slot, admin slot via
      `getStorageAt`
- [x] Transparent vs UUPS labelling (admin slot heuristic); beacon resolution via
      `implementation()`
- [x] Resolve the implementation address, then re-run adapters against it
- [x] Record `code hash` of the (implementation) bytecode for staleness checks
- [ ] EIP-1822 `proxiableUUID` confirmation _(deferred; slot heuristic is enough
      for the slice)_

### Orchestrator

- [x] `resolveContract({ address, chainId, reader?, apiKey?, adapters? })`
- [x] Adapter order (Sourcify first, then explorer)
- [x] Follow proxy → implementation (on-chain + explorer hint); attach `ProxyInfo`
- [x] Fallback: no ABI found → typed failure with tried sources + guidance
- [x] Provenance + confidence attached to the result

### Tests

- [x] Unit: Sourcify adapter (mocked `fetch`, full/partial/miss)
- [x] Unit: explorer adapter (mocked `fetch`, verified/unverified/proxy)
- [x] Unit: proxy slot decoding (mocked `getStorageAt` + beacon `call`)
- [x] Unit: orchestrator (adapter ordering, proxy follow, fallback) - 18 passing

## `apps/studio` integration

- [x] `ImportWizard`: tabs - **Paste ABI** (existing) and **By address** (new)
- [x] By-address form: address, chainId, RPC, optional explorer API key → Resolve
- [x] On resolve: preview provenance/proxy/confidence; prefill on create
- [x] Persist `provenance`/`proxy` on `Project`; provenance badge in the
      `ProjectView` header (verified/unverified, source, proxy → impl)
- [x] Handle resolve errors inline; fall back to manual paste

## Docs & CI

- [x] ADR-003 - resolver adapter strategy & trust model
- [x] Update `PROGRESS.md`, `docs/roadmap.md`
- [x] Keep lint/typecheck/test/build/e2e green (15 lint/type, 14 test tasks)

## Definition of done

- [x] By-address flow resolves a verified address → generates the app
- [x] A proxy address resolves to its implementation ABI with a visible badge
- [x] Unverified/unknown address degrades gracefully to manual paste
- [x] Provenance + confidence visible and persisted; all checks green
- [ ] Live mainnet smoke against a real verified address _(manual; needs network + optional explorer key, not run in CI)_
