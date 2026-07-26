# Universal hardening backlog

> **North star:** this is **not** a tool for one contract. It's a universal engine that
> must correctly understand _any_ EVM contract from its ABI (and source/NatSpec when
> available). Two rules follow from that:
>
> 1. **Correctness > coverage.** A wrong label (e.g. "admin / high-risk" on a user action)
>    is worse than an honest `unknown → Raw`. Never assert privilege/risk without evidence.
> 2. **Graceful, transparent degradation.** When unsure, drop to Raw and say why. Never
>    silently analyze the wrong thing (e.g. a proxy shell).

## Who this is for (and what we deliberately do NOT build)

The value is **safely operating arbitrary / new / custom / UI-less contracts** — especially
their privileged surface. Three audiences, one common need:

- **Builders & devs** — instant admin console + test UI for a freshly-deployed contract, no
  throwaway React.
- **Custody / multisig / DAO ops** — call privileged functions on _any_ contract with correct
  role checks, risk badges, and a confirm flow. No good tool exists here today.
- **Self-custody / trust-minimised users** — interact with contracts that have no frontend, or
  where you don't trust the frontend (verify calldata, use Raw).

**Non-goals (explicit):**

- ❌ **No protocol-specific packs** (Uniswap/Aave/Curve/Seaport "detectors"). They already have
  great frontends, our audience won't come to us to swap, and memorising N protocols is a
  treadmill that makes the engine _wider_, not _smarter_. If DeFi semantics are added, they must
  come from **general, first-principles signals** (ERC standards like 4626/permit, shape- and
  event-based inference) that generalise to every fork and every unknown contract — never from
  "this address/interface is Unispwap".
- ❌ No custodial backend, no hosted keys — everything stays client-side / self-hostable.

Litmus test for any new feature: _does it make us better at an **arbitrary** contract our three
audiences would actually paste?_ If it only helps one named protocol, it's out of scope.

## Empirical baseline (12 real mainnet contracts, 2026-07-26)

Ran `buildManifest` on live ABIs (Blockscout). Snapshot of where we stand today:

| Contract         | Standards        | writes | classified | avg conf | verdict                                       |
| ---------------- | ---------------- | ------ | ---------- | -------- | --------------------------------------------- |
| WETH             | erc-20           | 5      | 5/5        | 91%      | ✅ great                                      |
| BAYC             | erc-721, ownable | 16     | 14/16      | 60%      | ✅ good (but paid mint mislabeled)            |
| DAI              | erc-20           | 11     | 6/11       | 62%      | 🟡 permit/aux missed                          |
| ENS Registry     | none             | 7      | 7/7        | 43%      | 🟡 name-heuristic only                        |
| UniswapV2 Router | none             | 17     | 8/17       | 34%      | ⚠️ no DeFi semantics                          |
| UniswapV3 Pool   | none             | 9      | 5/9        | 36%      | ⚠️ no DeFi semantics                          |
| Compound cDAI    | erc-20           | 25     | 4/25       | 41%      | ⚠️ lending unmodeled; `mint` mislabeled admin |
| Seaport 1.6      | none             | 12     | 0/12       | 25%      | ⚠️ marketplace unmodeled (→ Raw)              |
| USDC             | upgradeable      | 3      | —          | 58%      | ❌ analyzed the proxy shell                   |
| Aave v3 Pool     | upgradeable      | 5      | —          | 46%      | ❌ analyzed the proxy shell                   |
| Lido stETH       | none             | 0      | —          | 35%      | ❌ Aragon proxy not followed                  |
| Governor Bravo   | none             | 1      | 0/1        | 31%      | ❌ delegator proxy + non-OZ shape             |

**Takeaways:** simple standard tokens/NFTs/vaults/OZ-Governor are excellent; everything
else degrades to Raw. The two make-or-break gaps are **proxy resolution** and
**context-blind name heuristics** producing wrong labels.

## Backlog (prioritized)

### P0 — correctness (never mislabel)

- [x] **Signature-aware `mint`.** `mint(address,uint256)` non-payable = privileged supply
      (admin/high). `payable` mint = user/public sale (user/medium). `mint(uint256[,address])`
      non-4626 = deposit-like (user). Was: all `mint*` → admin/high (wrong for cToken
      deposits and NFT paid mints). Done in `heuristics.ts` (`mintShapeRule`), tested in
      `heuristics.test.ts`. Verified on live cDAI: `mint(uint256)` → `fund-deposit/user/low`.
- [x] **Audit name rules for false positives (round 1).** `withdraw` is now shape-aware
      (`withdraw(uint256…)` → user; no-arg `withdraw()` → privileged drain), fixing WETH
      unwrap (was admin) and keeping BAYC owner-withdraw as admin/high. Removed the too-generic
      `add`/`remove` from the admin-config rule so `addLiquidity`/`removeLiquidity` fall to Raw
      instead of a false `admin` label. Verified via the corpus (WETH/BAYC/Uniswap diffs are
      intended) and unit-tested. Remaining verbs (`burn`, `deposit`, `claim`, `set*`) reviewed
      and left as-is.
- [ ] **Risk heuristic precision.** `payable` alone shouldn't imply medium risk for
      obvious user deposits; `upgrade`/`setAdmin`/`migrate` stay high.

### P0 — proxy transparency & robustness

- [x] **Never present a proxy shell as the contract.** The resolver now sets
      `proxy.unresolvedImplementation` when it detects a proxy but can't fetch a verified ABI
      for the implementation, and the studio shows a prominent banner instead of silently
      rendering the shell.
- [x] **Broaden proxy detection** beyond EIP-1967 slots: EIP-1167 minimal-proxy clones
      (canonical + PUSH0 bytecode), legacy `implementation()` getters (EIP-1822/OZ pre-1967,
      code-verified to avoid false positives), and Gnosis Safe `masterCopy()`. Beacon +
      explorer-reported implementation were already handled. Unit-tested in `proxy.test.ts`.
- [~] **Proxy UX in the renderer/studio:** banner shipped (shows kind + implementation
  address when known). Still TODO: a manual-override address/ABI field to re-resolve the
  implementation in one click. Aragon `AppProxyUpgradeable` / Compound `*Delegator`
  shapes also still pending.

### P0 — admin/permission correctness (the core for custody & devs)

> The 6-contract NatSpec measurement (2026-07-26) showed privilege upgrades fire correctly but
> **rarely**, because big contracts gate access with signals we don't yet read. Closing this is
> the highest-leverage, fully-general work for our audience.

- [x] **NatSpec/modifier enrichment.** `@notice`/`@param` → descriptions + input labels;
      `onlyOwner`/`onlyRole(...)`/`auth`-style modifiers promote `user → admin` with a concrete
      permission (upgrade-only; absence proves nothing). Measured on real contracts: ~40% of
      functions gained human descriptions; all 3 privilege upgrades (DAI `rely`, BAYC
      `flipSaleState`/`reserveApes`) were correct. See `natspec.test.ts` + `enrich.test.ts`.
- [x] **Body-level access detection.** `parseNatSpec` now also mines `require/if (msg.sender ==
owner()/admin/...)`, `_checkOwner()`, `_checkRole(ROLE)`, `hasRole(ROLE, msg.sender)`, and
      custom `onlyX` modifiers whose _definition_ contains such a check. Each function gets a
      resolved, serialisable `AccessHint {kind, role?, detail}` that `enrichOperations` uses to
      promote user→admin with a concrete permission + human evidence (upgrade-only). Unit-tested
      in `natspec.test.ts` + `enrich.test.ts`.
      **Known limitation:** checks hidden behind an internal call (Compound's public `_setX` →
      internal `_setXFresh` where the `if (msg.sender != admin)` lives) are not followed — that
      needs intra-contract call-graph analysis and is deferred (risk of complexity/overfit).
- [x] **Surface the evidence in the UI.** `PermissionBadge` (🔒 "owner only" / "role: MINTER_ROLE"
      / "restricted") now renders on every privileged operation card, with the access justification
      ("restricted to owner", "requires MINTER_ROLE") as a hover tooltip pulled from the operation's
      modifier/source-ast evidence. Custody operators can see _why_ a function is admin at a glance.
      Unit-tested in `Badges.test.tsx`.
- [ ] **Risk heuristic precision.** `payable` alone shouldn't imply medium risk for obvious user
      deposits; `upgrade`/`setAdmin`/`migrate` stay high.

### P0 — transaction trust (the core for self-custody)

- [x] **Calldata preview + dry-run before send.** A "Preview" action on every write encodes the
      exact calldata and runs an `eth_call` simulation, showing target/decoded args/value/gas and
      whether it would succeed or revert (with the decoded reason) _before_ the user signs. Fully
      general (`previewWrite` in execution → `WritePreviewView`); the flagship "don't trust the
      frontend" feature. Unit-tested in `write.test.ts` + `WritePreviewView.test.tsx`.
- [ ] **Proxy implementation override.** Manual address/ABI field in the proxy banner to
      re-resolve an implementation in one click (matters for Safe / upgradeable treasuries).

### P1 — coverage (understand more, safely — general signals only)

- [ ] **More token/standard shapes:** DAI-style `permit`, ERC-777, ERC-1155 nuances,
      fee-on-transfer, rebasing — all via interface/shape detection, applicable to any contract.
- [ ] **Non-OZ governance:** Governor Bravo/Alpha _shapes_ (by function shape, not by named
      protocol).
- [ ] **Event-based inference.** Use emitted events (e.g. `Transfer`, `RoleGranted`) as
      corroborating evidence for ambiguous writers.
- [ ] **Aragon/`*Delegator` proxy shapes** (finishes proxy coverage generically).

### P1 — make improvements measurable

- [x] **Real-contract regression harness.** Curated corpus of 10 real mainnet contracts
      with **vendored ABIs** → offline, deterministic classification snapshot
      (`scripts/corpus/`). `pnpm corpus` diffs current output vs `baseline.json`;
      `pnpm corpus:update` refreshes it. Every rule change now shows what improved/regressed
      on real contracts. See `scripts/corpus/README.md`.
- [ ] **Source-backed corpus row(s).** The corpus is ABI-only, so it can't measure NatSpec/
      body-access improvements. Vendor trimmed source for a couple of contracts so those gains
      become part of the regression baseline too.

### P2 — polish

- [ ] Confidence calibration against the corpus (thresholds in ADR-001).
- [ ] Per-standard input-widget coverage review.
- [ ] Multi-contract / diamond (EIP-2535) facets.

## Log

- 2026-07-26: **transaction preview + dry-run** shipped — every write now has a "Preview" action
  that encodes the exact calldata and `eth_call`-simulates it, showing target/args/value/gas and a
  pass/revert verdict (decoded reason) before the user signs. `previewWrite` (execution) +
  `WritePreviewView` (renderer), wired into both the studio and generated-app runtimes. The core
  "don't trust the frontend" trust feature for self-custody; 100% general. Unit-tested.
- 2026-07-26: baseline captured; backlog created.
- 2026-07-26: signature-aware `mint` shipped (fixes cToken/NFT-paid-mint mislabels).
- 2026-07-26: name-rule audit round 1 — shape-aware `withdraw`; dropped generic `add`/`remove`
  from admin-config (avoids false-admin on DeFi user actions). Corpus baseline refreshed.
- 2026-07-26: proxy transparency — broadened detection (EIP-1167 clones, legacy
  `implementation()`, Gnosis `masterCopy()`) + `unresolvedImplementation` flag + studio
  shell-warning banner so a proxy shell is never silently shown as the real contract.
- 2026-07-26: NatSpec/modifier enrichment — author `@notice`/`@param` become descriptions +
  input labels; access modifiers promote user→admin with a concrete permission (upgrade-only).
  Resolves ABI-only ambiguity (withdraw/roles) with the author's own signal.
- 2026-07-26: real-contract regression harness added (10 contracts, offline baseline).
- 2026-07-26: measured NatSpec on 6 real contracts (ABI+source): +62 descriptions & +57 input
  labels across 157 ops (~40% coverage where docs exist, honest 0 where they don't); 3 privilege
  upgrades, all correct. Measurement also caught + fixed a prototype-key crash in `parseNatSpec`.
- 2026-07-26: **strategy pivot** — dropped protocol-specific DeFi packs (Uniswap/Aave/etc.) as a
  non-goal (treadmill + wrong audience). Refocused the roadmap on universal admin/permission
  correctness (body-level access detection) and transaction trust (calldata preview + dry-run),
  which serve builders / custody / self-custody on _any_ contract. See "Who this is for".
- 2026-07-26: body-level access detection shipped — inline `require/if (msg.sender==…)`,
  `_checkOwner`/`_checkRole`/`hasRole`, and custom privileged modifiers now resolve to an
  `AccessHint` that upgrades user→admin (upgrade-only). Re-measured on 6 real contracts: still 3
  correct upgrades (BAYC/DAI covered by modifiers; Compound hides checks behind internal `*Fresh`
  calls — a documented limitation; ENS uses per-node auth, correctly not global admin).
- 2026-07-26: `PermissionBadge` renders the gating (owner / role / custom) on privileged operation
  cards with the access justification as a tooltip — the "why is this admin?" trust signal for
  custody operators.
