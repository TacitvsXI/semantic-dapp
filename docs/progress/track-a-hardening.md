# Track A - Hardening toward stable `v0.1.0`

Supply-chain and pre-launch hardening after the `v0.1.0-beta` UX work. Goal: make
the repo safe to promote widely and keep dependencies current with minimal churn.

## Dependency / security review

- [x] **Audit triage** - `pnpm audit --prod` flagged 14 advisories (2 high, 12
      moderate), all transitive in the wallet stack (`axios`, `ws`, `uuid` via
      wagmi/rainbowkit/metamask/coinbase connectors).
- [x] **Remediated via pnpm overrides** (`package.json`): `axios >=1.18.0`,
      `ws >=8.21.0`, `uuid >=11.1.1`. `pnpm audit --prod` now reports **no known
      vulnerabilities**; build + all tests stay green.
- [x] **Dependabot** (`.github/dependabot.yml`) - weekly npm + github-actions
      updates, grouped (dev / prod minor+patch / actions) to avoid PR noise.
- [x] **CodeQL** (`.github/workflows/codeql.yml`) - `security-and-quality`
      code scanning for javascript-typescript on push/PR + weekly cron.
- [x] **Security workflow** (`.github/workflows/security.yml`) - `pnpm audit`
      gate (fails on high) + `dependency-review-action` on PRs (fails on high).

## Testnet-funded demos

- [x] **Deploy flow documented** (`docs/demos.md`, `Deploy.s.sol` comments) - the
      existing Foundry script already deploys the fixtures to any RPC via
      `PRIVATE_KEY`; added Sepolia/Base-Sepolia usage with `--verify`.
- [ ] **Actual testnet deployment** - a manual step (needs a funded key + faucet
      ETH), then bake the addresses into the demo bundles / Pages demo. Left to
      the maintainer; script + docs are ready.

## Gates

- [x] `pnpm audit --prod` - no known vulnerabilities
- [x] `pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm test` green after
      the dependency overrides + lockfile update

## Remaining before tagging `v0.1.0` (stable)

- [ ] Deploy the demos to a public testnet and update the live demo bundle.
- [ ] Screenshots/GIFs of the vault and RWA demos in `docs/demos.md`.
- [ ] Optional: enable GitHub secret scanning + branch protection requiring CI +
      CodeQL to pass (repo settings, maintainer action).
