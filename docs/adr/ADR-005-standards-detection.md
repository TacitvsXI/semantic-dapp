# ADR-005: Standards detection engine & access model

- Status: Accepted
- Date: 2026-07-19

## Context

Phase 1 shipped a single hand-written ERC-20 detector. Phase 4 must recognize
many more standards (ERC-721/1155/4626) and access models (Ownable,
AccessControl, Pausable, upgradeable/UUPS). Doing this deterministically from the
ABI — without executing the contract — keeps the pipeline safe and reproducible
(ADR-001), but detectors must not become copy-pasted one-offs, and multiple
standards can apply to one contract (e.g. an ERC-4626 vault is also an ERC-20,
and may be Ownable + Pausable).

## Decision

- A **generic, member-based detection engine** (`detectByMembers`) scores a
  contract against a declarative spec: required/optional members (functions or
  events), a mandatory core set, a confidence threshold, and an optional ERC-20
  prerequisite. Each standard is data, not bespoke code.
- Each standard/capability is a `StandardDetector` (`id`, `detect`, `semantics`).
  A **registry** runs all detectors and merges the semantics of the _detected_
  ones into a single signature→semantic lookup (first-wins priority), each entry
  tagged with its source standard and that detection's confidence
  (`ResolvedSemantic`).
- Detection is **ABI-shape based**. ERC-165 interface IDs are recorded as
  evidence, but presence of the interface's function set is the signal (no
  on-chain `supportsInterface` call is required to classify).
- **Access model** is detected separately (`detectAccessModel` →
  `ownable` | `access-control` | `none`) and attached as a `permission` to
  privileged operations, so the UI can explain how an action is gated.
- The classifier consumes the merged semantics; it no longer hard-codes ERC-20.
  Unmatched functions still fall back to the Raw view — nothing is dropped.

## Consequences

- Adding a standard is declarative: define members + semantics, register it, add
  a test. No classifier changes required.
- Overlapping standards coexist; confidence is per-operation from its source.
- The same engine will absorb future standards (ERC-2612 permit, ERC-777, etc.).
- Deterministic and network-free, so unit tests fully cover detection.
