# ADR-011: Execution envelope for fail-closed Raw writes

- Status: Accepted
- Date: 2026-07-26

## Context

Raw writes are the highest-uncertainty path. Phase 1 added confirm + typed
`CONFIRM`; Phase 2 required a successful Preview and invalidated it when form
args or wallet/target changed. That still left a gap: the UI could show a Preview
whose **calldata** no longer matches what encode would produce after an ABI or
proxy-implementation change, or a Preview that was bound without hashing the
bytes that will actually be signed.

Community review (r/ethdev) asked for an execution envelope binding chainId,
account, to, value, calldata, and integrity fingerprints.

## Decision

After a **successful** Preview on a Raw write, bind an `ExecutionEnvelope`:

- `chainId`, `account`, `to`, `value`
- `calldata` + `calldataHash` (`keccak256`)
- function `signature` + normalized `args`
- optional integrity from the host runtime: `abiHash`, `manifestHash`,
  `implementation`, `codeHash`, `facetSet` (diamonds)
- `simulationBlock` when the RPC provides it (audit only)

Submit is allowed only while a freshly rebuilt envelope (re-encoded calldata +
current wallet/target/integrity) still **matches** the bound one. Form edits and
context-key drift clear the bound envelope. `simulationBlock` is stored but
**excluded** from equality — blocks advance continuously and must not force a
re-preview on every new block.

Hosts (studio / generated-app) populate `runtime.executionContext` with at least
`abiHash`; proxy implementation, code hash, and diamond facets when known.

## Consequences

- Raw writes are stricter than classified high-risk: Preview + envelope + confirm
  - typed `CONFIRM`.
- Envelope logic lives in `@semantic-dapp/renderer` (`executionEnvelope.ts`); no
  new network dependency for the gate itself beyond the existing Preview RPC.
- Phase 2 fingerprint helper remains as a thin deprecated wrapper.
