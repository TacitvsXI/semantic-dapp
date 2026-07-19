# Demos

Three ready-to-render [`SemanticBundle`](export.md)s live in
[`docs/demo/bundles`](demo/bundles). Each is generated from a real Foundry
fixture (`contracts/fixtures`), so what you see is exactly what the analyzer
produces from compiled ABIs - no hand-tuning.

| Demo                                                  | Fixture     | Standards detected              | Shows off                                                                 |
| ----------------------------------------------------- | ----------- | ------------------------------- | ------------------------------------------------------------------------- |
| [`erc20.bundle.json`](demo/bundles/erc20.bundle.json) | `MockERC20` | ERC-20                          | Token transfer/approve UI + owner-gated `mint`                            |
| [`vault.bundle.json`](demo/bundles/vault.bundle.json) | `MockVault` | ERC-20, ERC-4626                | Vault deposit/mint/withdraw/redeem with previews and share balances       |
| [`rwa.bundle.json`](demo/bundles/rwa.bundle.json)     | `MockRWA`   | ERC-20, AccessControl, Pausable | Role manager, an emergency pause panel, and confirmation for critical ops |

Regenerate them after changing a fixture:

```bash
cd contracts/fixtures && forge build   # produce artifacts
cd - && pnpm gen:abi                    # extract ABIs → contracts/fixtures/abi
pnpm build && pnpm gen:demos            # rebuild the bundles
```

## Render a demo in the standalone app

The standalone template renders whatever bundle it finds - so a demo is just data.

```bash
pnpm build
cp docs/demo/bundles/vault.bundle.json apps/generated-app/public/bundle.json
pnpm --filter @semantic-dapp/generated-app dev
```

Open the printed URL. Swap the copied file for `erc20`/`rwa` to see the others.
Without a `public/bundle.json` the template falls back to a committed demo token.

## Render a demo with the CLI

```bash
pnpm build
node packages/cli/dist/cli.js export \
  --bundle docs/demo/bundles/rwa.bundle.json --out /tmp/rwa-app
cd /tmp/rwa-app && pnpm install && pnpm build
node <repo>/packages/cli/dist/cli.js serve --dir dist
```

`export` scaffolds a standalone app with the bundle injected; build it, then
`serve` (or any static host) previews it. See [`export.md`](export.md) for the
full CLI reference, including building a bundle straight from an ABI file.

## Drive them against a live chain

The bundles carry `chainId 31337` and `rpcUrl http://127.0.0.1:8545`, matching the
Foundry deploy script. To make the write buttons real, start Anvil and deploy:

```bash
anvil                                   # terminal 1
cd contracts/fixtures
forge script script/Deploy.s.sol \
  --rpc-url http://127.0.0.1:8545 --broadcast   # terminal 2
```

The script prints the deployed `MockERC20`, `MockVault` and `MockRWA` addresses;
add the matching `address` to a bundle (or import the contract by address in the
studio) to read and write against the live deployment.
