# Progress Dashboard

Live status of the Semantic Dapp build. See [`docs/roadmap.md`](docs/roadmap.md)
for the full plan.

## Phases

| Phase | Focus                    | Status             |
| ----- | ------------------------ | ------------------ |
| 0     | Foundation & repo setup  | ✅ Done            |
| 1     | Raw ABI runtime (slice)  | ✅ Done (`v0.0.1`) |
| 2     | Address resolver         | ✅ Done (slice)    |
| 3     | Semantic manifest        | ⬜ Not started     |
| 4     | Standards analyzer       | ⬜ Not started     |
| 5     | Classification & routing | ⬜ Not started     |
| 6     | Trusted UI components    | ⬜ Not started     |
| 7     | Safety & diagnostics     | ⬜ Not started     |
| 8     | Export & CLI             | ⬜ Not started     |
| 9     | Fixtures, docs, beta     | ⬜ Not started     |

## Current phase: Phase 2 — Address Resolver

Detailed checklist: [`docs/progress/phase-2-address-resolver.md`](docs/progress/phase-2-address-resolver.md).

`address + chainId → resolver (Sourcify / block-explorer) → EIP-1967 proxy
detection → ABI + provenance → normalize → classify → generated app`. New package
`packages/resolver` (18 unit tests); studio gains a **By address** import tab and
a provenance badge. See [ADR-003](docs/adr/ADR-003-resolver-adapters.md).

Deferred small enhancements are tracked in
[`docs/progress/backlog.md`](docs/progress/backlog.md).

## Previous phase: Phase 1 — Vertical Slice to v0.0.1

Detailed checklist: [`docs/progress/phase-1-vertical-slice.md`](docs/progress/phase-1-vertical-slice.md).

| Workstream                       | Status                |
| -------------------------------- | --------------------- |
| Foundation (Day 1)               | ✅ Done               |
| `spec` — contract model & schema | ✅ Done               |
| `contracts/fixtures` (Foundry)   | ✅ Done               |
| `execution` — viem/wagmi         | ✅ Done               |
| `components` — generic widgets   | ✅ Done               |
| `renderer` — sections/tabs       | ✅ Done               |
| `studio` — import & raw UI       | ✅ Done               |
| `analyzer` — ERC-20 detector     | ✅ Done               |
| `components` — ERC-20 semantic   | ✅ Done               |
| `classifier` — routing rules     | ✅ Done               |
| Tests & CI                       | ✅ Done               |
| Demo & v0.0.1 release            | ✅ Done (tag pending) |

Legend: ✅ done · 🚧 in progress · ⬜ not started

## Vertical slice at a glance

`Manual ABI → normalized ContractModel → ERC-20 detector → classifier → semantic
manifest → generated User/Admin/Raw app → wallet transaction (Anvil)`.

Packages: `spec`, `execution`, `components`, `renderer`, `analyzer`, `classifier`

- `apps/studio` + `contracts/fixtures`. Tests: 83 (unit/integration/forge/e2e).
  See [`docs/progress/phase-1-vertical-slice.md`](docs/progress/phase-1-vertical-slice.md)
  for the full checklist and [`docs/demo.md`](docs/demo.md) for the walkthrough.

## Releasing `v0.0.1`

The code is release-ready. To cut the tag (run manually when you're ready):

```bash
git add -A && git commit -m "feat: Phase 1 vertical slice (v0.0.1)"
git tag v0.0.1
```
