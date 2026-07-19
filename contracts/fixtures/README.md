# Contract fixtures

Foundry project with the contracts used for analyzer detection, the demo, and
end-to-end read/write integration tests.

- [`src/Counter.sol`](src/Counter.sol) — view/write functions + a custom error.
- [`src/MockERC20.sol`](src/MockERC20.sol) — self-contained ERC-20 with `mint`,
  events and custom errors.

## Prerequisites

[Foundry](https://book.getfoundry.sh/) (`forge`, `anvil`). The `forge-std` lib is
not committed; install it once:

```bash
forge install foundry-rs/forge-std --no-git
```

## Build & test

```bash
forge build
forge test
```

## Local deploy (for the studio demo)

Start a local chain and deploy the fixtures:

```bash
anvil                       # terminal 1
forge script script/Deploy.s.sol \
  --rpc-url http://127.0.0.1:8545 --broadcast   # terminal 2
```

The script deploys `Counter` and `MockERC20` (minting 1,000,000 FIX to the
default Anvil account #0) and prints their addresses.

The JS integration tests (in `packages/execution`) build these contracts and
deploy them to an ephemeral Anvil instance automatically.
