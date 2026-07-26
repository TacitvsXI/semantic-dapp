# Real-contract regression corpus

Measures the analyzer/classifier against a curated set of **real mainnet contracts**, so
every rule change can be judged on reality instead of toy fixtures. This is the
measurement tool behind [`docs/progress/universal-hardening.md`](../../docs/progress/universal-hardening.md).

## How it works

- `contracts.json` — the curated corpus (address + chain + category).
- `abis/<chainId>-<address>.json` — **vendored ABIs** (trimmed to functions + events) so
  the check is offline and deterministic.
- `baseline.json` — the committed classification snapshot (standards, op counts, avg
  confidence, and every `function => operationType/audience/risk`).

## Commands

```bash
pnpm corpus          # offline: compare current classification to the baseline (CI-safe)
pnpm corpus:update   # offline: regenerate baseline.json after an intended change
pnpm corpus:fetch    # network: refresh vendored ABIs (needs internet, keyless Blockscout)
```

## Typical workflow

1. Change a rule in `@semantic-dapp/analyzer` / `@semantic-dapp/classifier`.
2. Run `pnpm corpus`. It prints a per-contract diff of what moved.
3. If the diff is an improvement, `pnpm corpus:update` and commit the new baseline
   alongside the code change — the baseline diff becomes a readable record of impact.

## Notes

- Proxy entries (`followProxy: true`) may vendor the **proxy shell** ABI when the explorer
  doesn't report an implementation. That's intentional: it documents the proxy blind spot
  until proxy resolution is hardened.
- To add a contract: add it to `contracts.json`, run `pnpm corpus:fetch`, then
  `pnpm corpus:update`.
