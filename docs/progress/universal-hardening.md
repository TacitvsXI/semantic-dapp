# Universal hardening backlog

> **North star:** this is **not** a tool for one contract. It's a universal engine that
> must correctly understand _any_ EVM contract from its ABI (and source/NatSpec when
> available). Two rules follow from that:
>
> 1. **Correctness > coverage.** A wrong label (e.g. "admin / high-risk" on a user action)
>    is worse than an honest `unknown → Raw`. Never assert privilege/risk without evidence.
> 2. **Graceful, transparent degradation.** When unsure, drop to Raw and say why. Never
>    silently analyze the wrong thing (e.g. a proxy shell).

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
- [ ] **Audit every name rule for false positives.** `burn`, `withdraw`, `deposit`,
      `claim`, `set*` — verify against the real corpus; prefer lower confidence + user
      audience when the shape is ambiguous rather than asserting admin.
- [ ] **Risk heuristic precision.** `payable` alone shouldn't imply medium risk for
      obvious user deposits; `upgrade`/`setAdmin`/`migrate` stay high.

### P0 — proxy transparency & robustness

- [ ] **Never present a proxy shell as the contract.** If the model looks like a proxy
      (tiny ABI + `implementation()`/`admin()`/1967 slots/`fallback`), flag it and, in the
      app, resolve the implementation before classifying.
- [ ] **Broaden proxy detection** beyond EIP-1967: EIP-1167 minimal-proxy clones, beacon
      proxies, Aragon `AppProxyUpgradeable`, delegatecall "delegator" patterns
      (Compound `*Delegator`), and explorer-reported `Implementation`.
- [ ] **Proxy UX in the renderer/studio:** a clear banner "this is a proxy → showing the
      implementation at 0x…" with a manual-override address field.

### P1 — coverage (understand more, safely)

- [ ] **NatSpec/source enrichment.** Resolver already fetches source; mine `@notice`/
      `@dev`/`@param` for titles/descriptions and modifiers for permission hints. Closes
      the README's "(and source/NatSpec when available)" promise.
- [ ] **DeFi detector packs:** Uniswap V2/V3 (swap/add/removeLiquidity), Compound/Aave
      (supply/borrow/repay/redeem), so the biggest real contracts get real semantics.
- [ ] **Non-OZ governance:** Governor Bravo/Alpha shapes.
- [ ] **More token shapes:** DAI-style `permit`, ERC-777, fee-on-transfer, rebasing.

### P1 — make improvements measurable

- [x] **Real-contract regression harness.** Curated corpus of 10 real mainnet contracts
      with **vendored ABIs** → offline, deterministic classification snapshot
      (`scripts/corpus/`). `pnpm corpus` diffs current output vs `baseline.json`;
      `pnpm corpus:update` refreshes it. Every rule change now shows what improved/regressed
      on real contracts. See `scripts/corpus/README.md`.

### P2 — polish

- [ ] Confidence calibration against the corpus (thresholds in ADR-001).
- [ ] Per-standard input-widget coverage review.
- [ ] Multi-contract / diamond (EIP-2535) facets.

## Log

- 2026-07-26: baseline captured; backlog created.
- 2026-07-26: signature-aware `mint` shipped (fixes cToken/NFT-paid-mint mislabels).
- 2026-07-26: real-contract regression harness added (10 contracts, offline baseline).
