# Demo: ABI → generated app → transfer

This is the Phase 1 vertical slice end to end: take a contract ABI, get a
generated User/Admin/Raw interface, connect a wallet, and send a token transfer -
all locally, against Anvil.

## 1. Start a local chain and deploy the fixtures

```bash
# terminal 1
anvil

# terminal 2
cd contracts/fixtures
forge install foundry-rs/forge-std --no-git   # first time only
forge script script/Deploy.s.sol \
  --rpc-url http://127.0.0.1:8545 --broadcast
```

Note the printed `MockERC20` address. Anvil funds account #0, which the deploy
script mints 1,000,000 FIX to.

## 2. Run the studio

```bash
pnpm install
pnpm build
pnpm --filter @semantic-dapp/studio dev
```

Open the printed URL (default `http://localhost:5173`).

## 3. Import the contract

1. Click **+ New import**.
2. Name it (e.g. "Fixture Token").
3. Paste the ERC-20 ABI (from `contracts/fixtures/out/MockERC20.sol/MockERC20.json`).
4. Set the **contract address** to the deployed `MockERC20` address.
5. Keep **Chain ID** `31337` and **RPC URL** `http://127.0.0.1:8545`.
6. Click **Create project**.

The analyzer detects ERC-20 and the classifier routes functions: `transfer` /
`approve` land in **User**, reads in **Read**, and everything stays available in
**Raw**. Confidence and evidence are shown per operation.

![Generated app](demo/generated-app.png)

## 4. Connect a wallet and transfer

1. Connect an injected wallet (e.g. MetaMask) pointed at
   `http://127.0.0.1:8545` (chain 31337). Import an Anvil private key to get a
   funded account.
2. In the **User** tab, use the **Transfer** panel: enter a recipient and an
   amount, then send. The studio simulates, estimates gas, submits, and shows the
   transaction lifecycle and final status.

The same read/simulate/write/receipt path is covered headlessly by the
integration test in `packages/execution` (`*.integration.test.ts`), which runs
against an ephemeral Anvil in CI.

## Screens

| Import wizard                     | Generated app                  | Raw tab                  |
| --------------------------------- | ------------------------------ | ------------------------ |
| ![Import](demo/import-wizard.png) | ![App](demo/generated-app.png) | ![Raw](demo/raw-tab.png) |

> A short screen recording (GIF) can be captured from step 3-4; the static
> screenshots above are regenerated with `CAPTURE=1 pnpm --filter
@semantic-dapp/studio test:e2e capture`.
