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

## Next candidates

- [ ] **npm publish** - publish `@semantic-dapp/*` (spec/execution/components/
      renderer + CLI) so the generated app can be embedded downstream.
- [ ] **More detectors** - e.g. ERC-2612 permit, ERC-1155 batch, Governor.
