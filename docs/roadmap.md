# Roadmap

Source of truth: `Semantic Dapp — Open-source Execution Plan`. MVP horizon:
10–12 weeks for a solo developer. Version 0.1 target.

## Phases

| Phase | Timeframe   | Focus                    | Output                                            |
| ----- | ----------- | ------------------------ | ------------------------------------------------- |
| 0     | 2–3 days    | Decisions & repo setup   | Monorepo, license, spec draft, CI skeleton        |
| 1     | Week 1      | Raw contract runtime     | Import ABI, render read/write, wallet execution   |
| 2     | Week 2      | Address resolver         | Chain/address import, ABI/source/proxy adapters   |
| 3     | Week 3      | Semantic manifest        | Schema, editor, save/load, migrations             |
| 4     | Weeks 4–5   | Standards analyzer       | ERC-20/721/1155/4626 + Ownable/AccessControl      |
| 5     | Week 6      | Classification & routing | User/Admin/Emergency/Raw sections                 |
| 6     | Week 7      | Trusted UI components    | Token, vault, role, pause and raw components      |
| 7     | Week 8      | Safety & diagnostics     | Simulation, errors, risk, fingerprints            |
| 8     | Week 9      | Export & CLI             | Standalone app and npx workflow                   |
| 9     | Weeks 10–12 | Fixtures, docs, beta     | Foundry contracts, Playwright, docs, v0.1 release |

## Release milestones

| Milestone         | Demo                            | Gate                                       |
| ----------------- | ------------------------------- | ------------------------------------------ |
| M1 — Raw Runtime  | ABI → working interface         | All ABI types, read/write, wallet          |
| M2 — Semantic ERC | ERC-20/4626 → understandable UI | Standards recognized without manual config |
| M3 — Admin Split  | AccessControl → admin console   | Roles and risk evidence visible            |
| M4 — Export       | One-click standalone build      | Works without Studio backend               |
| M5 — Public Beta  | 3 production-like demos         | Docs, CI, security policy, issue templates |

## Current status

See [`../PROGRESS.md`](../PROGRESS.md) for the live dashboard and
[`progress/phase-1-vertical-slice.md`](progress/phase-1-vertical-slice.md) for the
active phase checklist.

## In scope for the open-source MVP

- Import any EVM contract by chain ID + address
- Manual import of ABI, Foundry/Hardhat artifact and Solidity compiler output
- Proxy resolution and implementation binding
- ABI, NatSpec and source parsing
- Standard, role, risk and UI-pattern recognition
- User / Operator / Admin / Emergency / Raw interfaces
- Wallet connection and transaction execution
- Semantic manifest editing and export
- Standalone application export
- CLI, React renderer and component library

## Deliberately out of scope for the first MVP

- Custody or key storage
- Fireblocks / Copper / BitGo production integrations
- A Tenderly-grade transaction simulator
- Solana / Tron / non-EVM networks
- A promise of 100% understanding of arbitrary bytecode
- Arbitrary LLM-generated frontend code
- Full multi-tenant SaaS, billing and enterprise SSO

## Backlog after the vertical slice (Phases 2+)

Captured in [`progress/backlog.md`](progress/backlog.md).
