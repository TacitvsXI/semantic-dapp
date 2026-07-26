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
- [x] **Risk heuristic precision.** Done under admin/permission section below (`payable` is a
      medium floor; destructive names stay high).

### P0 — proxy transparency & robustness

- [x] **Never present a proxy shell as the contract.** The resolver now sets
      `proxy.unresolvedImplementation` when it detects a proxy but can't fetch a verified ABI
      for the implementation, and the studio shows a prominent banner instead of silently
      rendering the shell.
- [x] **Broaden proxy detection** beyond EIP-1967 slots: EIP-1167 minimal-proxy clones
      (canonical + PUSH0 bytecode), legacy `implementation()` getters (EIP-1822/OZ pre-1967,
      code-verified to avoid false positives), and Gnosis Safe `masterCopy()`. Beacon +
      explorer-reported implementation were already handled. Unit-tested in `proxy.test.ts`.
- [x] **Proxy UX in the renderer/studio:** banner + manual implementation override shipped;
      Aragon/`*Delegator` shapes shipped under P1.

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
- [x] **Risk heuristic precision.** `payable` no longer inflates risk on its own: the payable rule
      became a _medium floor_ at priority 45 (below the routing rules), so an obvious user action that
      happens to be payable keeps the risk its routing rule assigned, while an unrecognised payable
      writer still defaults to medium. Destructive/`upgrade`/`setAdmin`/`migrate` names stay
      critical/high at priority 70. Verified on the corpus: WETH `deposit()` moved medium → low
      (correct); nothing else changed. Unit-tested in `heuristics.test.ts`.

### P0 — transaction trust (the core for self-custody)

- [x] **Calldata preview + dry-run before send.** A "Preview" action on every write encodes the
      exact calldata and runs an `eth_call` simulation, showing target/decoded args/value/gas and
      whether it would succeed or revert (with the decoded reason) _before_ the user signs. Fully
      general (`previewWrite` in execution → `WritePreviewView`); the flagship "don't trust the
      frontend" feature. Unit-tested in `write.test.ts` + `WritePreviewView.test.tsx`.
- [x] **Proxy implementation override.** When auto-resolution fails, the proxy shell banner now
      offers "Fix implementation": resolve a verified ABI from a manually-entered implementation
      address, or paste the implementation ABI directly. The proxy address stays the call target
      (delegatecalls run there) — only the ABI changes; the manifest is rebuilt fresh. `ProxyOverride`
      in the studio, wired into `ProjectView`. Matters for Safe / upgradeable treasuries.
- [x] **Raw writes fail-closed (Phase 1–3).** Community review (r/ethdev): Raw was the _least_
      gated write path while unclassified ops are the _highest_ uncertainty. Confirm + typed
      `CONFIRM`, mandatory Preview, execution envelope (calldata hash + ABI/implementation
      integrity). See [`raw-write-fail-closed.md`](./raw-write-fail-closed.md) /
      [`ADR-011`](../adr/ADR-011-execution-envelope.md).

### P1 — coverage (understand more, safely — general signals only)

- [x] **DAI-style `permit` + ERC-777 shapes.** Two new detectors in `standards.ts`, registered in
      `registry.ts`. `dai-permit` matches the pre-2612 shape
      `permit(address,address,uint256,uint256,bool,uint8,bytes32,bytes32)` (a `bool allowed` toggle +
      `expiry`, distinct from ERC-2612's `deadline`+`value`), gated on the ERC-20 core, so DAI's
      gasless approve is now `token-approve/user/high` instead of `unknown`. `erc-777` matches the
      operator surface (`send`/`operatorSend`/`authorizeOperator`/`granularity`, events optional):
      `send`→transfer, `authorizeOperator`→`token-approve/high` ("grants full control"), `burn`/
      `operatorBurn`→burn. Both are pure shape detection (no named protocol). Unit-tested in
      `standards.test.ts`; corpus DAI improved 62→76% avg confidence, 6→7/11 classified writes.
- [x] **Rebasing / share-based tokens.** New `rebasing` shape detector (`standards.ts`) flags ERC-20s
      whose balance is derived from an internal share/scaled unit, so `balanceOf` can change with no
      transfer: Lido stETH shape (`sharesOf`+`getPooledEthByShares`/`getSharesByPooledEth`), Aave aToken
      shape (`scaledBalanceOf`+`scaledTotalSupply`), AMPL-style elastic supply (`rebase(uint256,int256)`).
      Requires the ERC-20 core to keep false positives near zero. Labels the share getters and, in the
      generated Overview, shows a plain-language advisory ("your balance can change with no transfer, and
      a transfer may deliver a different amount than you type"). Pure shape detection (any fork). Unit-
      tested in `standards.test.ts` (3 shapes + 2 negatives).
- [x] **ERC-1155 nuances.** Optional OZ/ecosystem surface on the existing `erc-1155` detector:
      `totalSupply(uint256)`/`exists(uint256)` (Supply), `burn`/`burnBatch` (Burnable),
      `mint`/`mintBatch` (privileged supply), `URI` event. Core detection unchanged; mint is
      `token-mint/admin/high`, burns are user/medium. Unit-tested.
- [x] **Fee-on-transfer (shape + advisory).** Cannot prove a fee from the ABI alone; instead we
      detect the common fee-exclusion admin surface (`excludeFromFee` + `includeInFee` /
      `isExcludedFromFee`) on an ERC-20 — near-zero false positives on clean tokens. Labels those
      admin ops, annotates `token-transfer` writers with a plain-language warning, and shows an
      Overview advisory. Live balance-delta simulation remains a future runtime nicety.
- [x] **Non-OZ governance (Governor Bravo/Alpha shapes).** New `governor-bravo` detector for the
      Compound-style surface used by Uniswap/ENS/many forks: 5-arg
      `propose(address[],uint256[],string[],bytes[],string)` (signatures[]), id-based
      `queue(uint256)`/`execute(uint256)`/`cancel(uint256)`, plus `castVote(uint256,uint8)` (Bravo) or
      `castVote(uint256,bool)` (Alpha). Signatures are disjoint from OpenZeppelin IGovernor (4-arg propose,
      hash-based queue/execute), so the two detectors never collide. Labels propose/vote/queue/execute and
      the common getters. Pure shape detection. Unit-tested (Bravo, Alpha, cross-negative vs OZ).
- [x] **Event-based inference.** `corroborateWithEvents` (classifier) lines up a writer with the
      event it conventionally emits — verb↔event (`deposit`↔`Deposit`, `pause`↔`Paused`,
      `approve`↔`Approval`) and `setX`↔`XUpdated/Changed/Set` — and adds an `event` evidence note
      plus a small, capped confidence nudge. Strictly additive: never changes type/audience/risk and
      never lowers confidence (absence of an event proves nothing). 100% general (Solidity naming
      convention). Verified on the corpus: WETH 91→92%, UniswapV3 36→37% avg confidence; no routing
      moved. Unit-tested in `events.test.ts`.
- [x] **Aragon/`*Delegator` proxy shapes.** `detectProxy` now recognises ERC-897 DelegateProxy
      (AragonOS app proxies: `proxyType()` returning 1/2 + `implementation()`) and the `*Delegator`
      family that exposes a non-1967 address getter (`comptrollerImplementation()` for Compound
      Unitroller & its forks, plus `getImplementation()`/`childImplementation()`). New kinds
      `erc897-delegate` / `delegator`; each still requires the resolved target to have code, so false
      positives stay near zero. Unit-tested in `proxy.test.ts`. Finishes generic proxy coverage.

### P1 — make improvements measurable

- [x] **Real-contract regression harness.** Curated corpus of 10 real mainnet contracts
      with **vendored ABIs** → offline, deterministic classification snapshot
      (`scripts/corpus/`). `pnpm corpus` diffs current output vs `baseline.json`;
      `pnpm corpus:update` refreshes it. Every rule change now shows what improved/regressed
      on real contracts. See `scripts/corpus/README.md`.
- [x] **Source-backed corpus row(s).** Two rows (DAI, BAYC) now carry vendored trimmed source
      (`scripts/corpus/sources/`, only files with functions/modifiers). The harness runs
      `parseNatSpec` on them and feeds `docs` into `buildManifest`, so the baseline records an
      `enriched` block (`descriptions`, `inputLabels`, `privilegedWrites`) and the audience upgrades.
      Measured gains, now regression-guarded: DAI +4 descriptions & `rely` → admin (ward-gated);
      BAYC +25 descriptions & 10 privileged writes (`flipSaleState`/`reserveApes`/… → admin via
      `onlyOwner`). `pnpm corpus:fetch-sources` refreshes them.

### P2 — polish

- [ ] Confidence calibration against the corpus (thresholds in ADR-001).
- [ ] Per-standard input-widget coverage review.
- [x] **Multi-contract / diamond (EIP-2535) facets.** Resolver detects diamonds via loupe
      `facetAddresses()`, enumerates facets with code, fetches each facet ABI, and merges them
      (selector-deduped) into one call surface — diamond address stays the call target. New
      `ProxyKind` `eip2535-diamond` + `facets` / `unresolvedFacets` on `ProxyInfo`. Studio shows a
      diamond banner (facet count; warn + paste ABI when facets are incomplete). `diamondCut` is
      labelled `upgrade`/`critical` in the upgradeable detector. Unit-tested (loupe, merge, resolve).

## Log

- 2026-07-26: **Raw fail-closed Phase 3** — execution envelope (calldata hash + integrity);
  ADR-011; track closed.
- 2026-07-26: **Raw fail-closed Phase 2** — mandatory successful Preview + fingerprint
  invalidation on Raw writes; Submit blocked until match.
- 2026-07-26: **Raw fail-closed Phase 1** — Raw writes require confirm + typed CONFIRM;
  `rawWriteWarnings` + banner; README aligned. See
  `docs/progress/raw-write-fail-closed.md`.
- 2026-07-26: **Raw fail-closed plan** — captured from r/ethdev review; see
  `docs/progress/raw-write-fail-closed.md`. Added as open P0 under transaction trust.
- 2026-07-26: **P1 tails closed** — ERC-1155 supply/burnable/mint semantics; fee-on-transfer via
  fee-exclusion admin shape + transfer advisory/Overview warn (honest: ABI can't prove the fee,
  only the management surface). P1 coverage checklist complete aside from eternal runtime FoT sim.
- 2026-07-26: **EIP-2535 diamond facets** — loupe `facetAddresses()` detection, per-facet ABI fetch +
  selector-deduped merge, diamond stays call target. Studio banner for facet count /
  unresolvedFacets; `diamondCut` → upgrade/critical. Closes the multi-contract/diamond P2 item
  (merge-first, not N Studio contracts).
- 2026-07-26: **Governor Bravo/Alpha shapes** — new `governor-bravo` detector for Compound-style
  governance (5-arg propose with `signatures[]`, id-based queue/execute/cancel, Alpha's bool `castVote`
  or Bravo's uint8). Disjoint from OZ IGovernor, so no collision. Labels propose/vote/lifecycle + getters.
  Overview chip: "Governor Bravo/Alpha". Unit-tested.
- 2026-07-26: **rebasing / share-based token detection** — new `rebasing` shape detector for stETH-,
  aToken- and AMPL-style tokens (share/scaled balance or elastic supply), gated on the ERC-20 core.
  Labels the share getters and adds a plain-language Overview advisory that `balanceOf` can change with
  no transfer. Fee-on-transfer deliberately left out — it can't be told from the ABI, only from a
  transfer simulation (future runtime feature). Unit-tested; corpus unchanged. Overview standard labels
  extended (ERC-777, permits, Governor, Rebasing).
- 2026-07-26: **DAI-style `permit` + ERC-777 shapes** — two shape detectors added. `dai-permit`
  recognises the pre-2612 permit (`bool allowed`+`expiry`) so DAI's gasless approve is labelled
  `token-approve/user/high` (was `unknown`); `erc-777` recognises the operator/send surface and flags
  `authorizeOperator` as full-control high risk. Both are first-principles shape detection. Corpus DAI
  62→76% avg confidence, permit + `DOMAIN_SEPARATOR` now labelled; baseline refreshed. Unit-tested.
- 2026-07-26: **Aragon/`*Delegator` proxy shapes** — `detectProxy` now resolves ERC-897 DelegateProxy
  (Aragon apps, via `proxyType()`+`implementation()`) and the `*Delegator` family (Compound Unitroller
  & forks via `comptrollerImplementation()`, plus `getImplementation()`/`childImplementation()`). New
  kinds `erc897-delegate`/`delegator`; each requires the target to have code. Closes generic proxy
  coverage; unit-tested.
- 2026-07-26: **event-based inference** — writers are now corroborated by the events they
  conventionally emit (verb↔event, `setX`↔`XUpdated`). Adds an `event` evidence note + a capped,
  upgrade-only confidence nudge; never changes routing. General Solidity convention, so it applies
  to any contract. Corpus: WETH 91→92%, UniswapV3 36→37% avg confidence, no routing changes.
- 2026-07-26: **source-backed corpus** — vendored trimmed source for DAI + BAYC so the regression
  harness measures NatSpec/modifier/body-access enrichment, not just ABI shape. Baseline now has an
  `enriched` block per source row. Confirmed, regression-guarded gains: DAI +4 descriptions & `rely`
  promoted to admin; BAYC +25 descriptions & 10 privileged writes surfaced (was Raw). This makes the
  admin-correctness work provable instead of anecdotal.
- 2026-07-26: **risk precision** — `payable` is no longer treated as inherently risky. It's now a
  medium _floor_ (priority 45, below routing) so obvious user actions keep their assigned risk while
  unknown payable writers still default to medium; destructive/upgrade/admin names stay high at 70.
  Corpus confirmed the intended, single change: WETH `deposit()` medium → low.
- 2026-07-26: **proxy implementation override** shipped — the "proxy shell" banner now has a "Fix
  implementation" action to resolve a verified ABI from a manually-entered implementation address or
  paste the impl ABI directly. Call target stays the proxy; only the ABI/manifest are rebuilt.
  Closes the last P0 transaction-trust item alongside preview/dry-run.
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
