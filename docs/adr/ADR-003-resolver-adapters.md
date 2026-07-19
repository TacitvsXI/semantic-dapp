# ADR-003: Address resolver adapter strategy & trust model

- Status: Accepted
- Date: 2026-07-19

## Context

Phase 2 turns a contract **address** into an ABI (and, ideally, verified source
and metadata) so the pipeline can generate a UI without manual ABI paste. Sources
of ABI/metadata differ in trust, availability, coverage and cost:

- **Sourcify** — decentralized, no API key, verified metadata (`full_match` vs
  `partial_match`), broad but not universal coverage.
- **Block explorers** (Etherscan-family) — wide coverage; Etherscan v2 exposes a
  single multichain endpoint, but rate-limited and better with an API key.
- Many contracts are **proxies**: the address holds little logic; the real ABI
  belongs to the implementation contract (EIP-1967 / UUPS / beacon).

The tool must stay **self-hostable** and work with **zero secrets** for local
development, while allowing keys/config for production coverage.

## Decision

- Define a small `AbiSourceAdapter` interface; each source is an independent,
  individually-testable adapter that returns a typed `ResolvedContract` or a
  typed failure.
- Ship two adapters initially: **Sourcify** (default, no key) and a
  **block-explorer** adapter (Etherscan v2 unified; API key optional).
- An **orchestrator** (`resolveContract`) runs adapters in a trust-ordered
  sequence (Sourcify first), performs **proxy detection** via EIP-1967 storage
  slots, follows to the implementation, and merges the best result.
- Every result carries **provenance** (which source, URL, verified flag,
  timestamp) and a **confidence** signal. Verified metadata outranks unverified
  ABI; guessed/failed lookups degrade to a manual-paste fallback.
- Record the implementation **code hash** to support later staleness detection
  (ties into ADR-002's manifest binding).
- The resolver only produces raw ABI/source/provenance; **normalization,
  analysis and classification stay in their existing packages** (decoupled).

## Consequences

- New adapters (e.g. 4byte-signature guessing, other explorers) plug in without
  touching callers.
- Zero-config local use works via Sourcify; production coverage is opt-in via an
  explorer API key.
- Provenance/confidence flow into the manifest and the UI, so users can see and
  trust where an interface came from — and proxies are made explicit.
