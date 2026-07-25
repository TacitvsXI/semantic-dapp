# Track C - New features

New semantic panels and detectors that widen what the generated app can do out of
the box. Tracked separately from hardening (Track A) and "it just works" UX
(Track B).

## Shipped

- [x] **ERC-4626 vault panel** - `VaultPanel` (components) + `VaultActions`
      (renderer). Segmented deposit / mint / withdraw / redeem, human-unit
      amounts, live conversion preview via `previewDeposit/Mint/Withdraw/Redeem`,
      share balance + `maxWithdraw`, connected account as receiver/owner. Appears
      whenever the standards analyzer tags a contract `erc-4626`; hides the four
      duplicate generic forms (and share transfer/approve). Tests:
      `VaultPanel.test.tsx`, `VaultActions.test.tsx`.

- [x] **Generic amount widgets** - `token-amount` manifest hints wired into the
      generic `FunctionForm` via `TokenAmountInput` (components) + `useAmountMeta`
      (renderer): human units, MAX from balance, base-unit echo, raw-integer
      fallback when decimals are unknown. Tests: `TokenAmountInput.test.tsx`,
      `FunctionForm.hint.test.tsx`.

- [x] **ERC-2612 detector (permit)** - member-based detector (`permit` / `nonces`
      / `DOMAIN_SEPARATOR`, requires the ERC-20 core) tagging contracts
      `erc-2612`. `permit` is routed as a high-risk user `token-approve` (gasless
      approve), `nonces` / `DOMAIN_SEPARATOR` as reads, and the permit `value`
      renders as a decimals-aware amount widget. Tests in `standards.test.ts` +
      `classify.test.ts`.
- [x] **Governor detector** - member-based detector for OpenZeppelin `Governor`
      (`propose` / `castVote` / `state` / `proposalSnapshot` / `proposalDeadline`
      core) tagging contracts `governor`. Adds additive `governance-propose` /
      `governance-vote` / `governance-execute` operation types; `propose` /
      `castVote` route to the user tab, `execute` is high-risk, and the proposal
      lifecycle reads (`state`, quorum, votes, deadlines) are labelled. Tests in
      `standards.test.ts` + `classify.test.ts`.
- [x] **ERC-1155 batch panel** - `BatchTransferPanel` (components) +
      `Erc1155Actions` (renderer): paired (token id, amount) rows kept
      index-aligned for you instead of two disconnected `uint256[]` inputs,
      encoding `safeBatchTransferFrom(from, to, ids, amounts, "0x")` with the
      connected account as `from`. Replaces the array-based generic card. Tests:
      `BatchTransferPanel.test.tsx`, `Erc1155Actions.test.tsx`.

- [x] **Governor proposal-builder panel** - `GovernorPanel` (components) +
      `GovernorActions` (renderer): a Propose tab with index-aligned target /
      value (ETH) / calldata rows + description, and a Vote tab with For / Against
      / Abstain, optional reason (`castVoteWithReason`), and a live `state`
      lookup. Replaces the raw triple-array `propose` form and bare `castVote`.
      Tests: `GovernorPanel.test.tsx`, `GovernorActions.test.tsx`.
- [x] **ERC-721 gallery** - `NftGallery` (components) + `Erc721Actions`
      (renderer): auto-lists the connected owner's tokens when Enumerable, lets
      you inspect any token id, and resolves `tokenURI` metadata across ipfs://,
      base64 `data:` and http(s) (name + image + owner cards). Tests:
      `metadata.test.ts`, `NftGallery.test.tsx`, `Erc721Actions.test.tsx`.

- [x] **Governor proposal board** - `ProposalBoard` (components) wired into
      `GovernorActions`: track proposals by id and see live `state` badges,
      proposer, vote-start / vote-end timepoints and whether the connected
      account has voted (`proposalSnapshot` / `proposalDeadline` /
      `proposalProposer` / `hasVoted`, all optional). Tests:
      `ProposalBoard.test.tsx`.
- [x] **Per-NFT transfer** - inline recipient form on gallery cards the connected
      account owns, encoding `safeTransferFrom(owner, to, id)` (falls back to
      `transferFrom`) with recipient validation. In `NftGallery` +
      `Erc721Actions`. Tests: `NftGallery.test.tsx`.

## Next candidates

- [ ] **npm publish** - publish `@semantic-dapp/*` (spec/execution/components/
      renderer + CLI) so the generated app can be embedded downstream.
- [ ] **More panels** - e.g. ERC-1155 batch balance viewer, Governor proposal
      discovery via `ProposalCreated` logs (needs event access in the runtime).
