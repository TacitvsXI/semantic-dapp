# ADR-006: Priority-based classification rule engine

- Status: Accepted
- Date: 2026-07-19

## Context

Through Phase 4 the classifier was a single lookup: a function was either a known
standard member (routed by its semantic) or an unknown that fell back to the Raw
view. Real contracts carry many meaningful functions that no standard describes —
`setFeeRecipient`, `rescueTokens`, `pause`, `claimRewards`, custom `withdraw` —
and dumping them all into Raw produces empty Admin/Emergency views for exactly
the contracts where governance clarity matters most. We need to classify those
functions too, without weakening the deterministic, standard-first guarantees or
losing the "nothing is dropped" invariant (ADR-001).

## Decision

Introduce a small **priority-based rule engine** in `packages/classifier`.

- A `ClassificationRule` inspects a `RuleContext` (the function, the contract
  model, the detected standards + merged semantics from ADR-005, and the access
  model) and optionally returns a `RuleMatch`: a partial classification
  (operationType, audience, title, description, risk, isRead) plus a `confidence`,
  a single `Evidence` entry, and a `priority`.
- `runRules` collects every match and resolves the final classification
  **field by field**: for each field, the highest-priority match that specifies
  it wins (ties broken by confidence). Confidence is taken from the
  highest-priority match that set the operation type; **evidence from all
  matching rules is accumulated** so decisions stay transparent.
- Rule order (priority): `standardRule` (100, authoritative Phase-4 semantics) →
  `nameHeuristicRule` (50) → `riskHeuristicRule` (40) → `readRule` (30) →
  `fallbackRule` (0, Raw/Developer). Standards always win routing; heuristics
  only fill gaps and add corroborating evidence.
- `OperationType` gains additive generic buckets (`admin-config`,
  `fund-withdraw`, `fund-deposit`, `claim`) so non-standard writers have honest
  types. This is backward compatible — old manifests never used them, so no
  schema migration is required.
- **Permissions are computed after resolution** from the final audience/type and
  the access model (`ownable` / `access-control`), with role operations always
  AccessControl-gated. This keeps permission logic in one place.

## Consequences

- Custom admin/emergency functions now populate the generated UI with correct
  audiences, risk and permissions; standard contracts are unchanged.
- Adding a heuristic is a one-file, data-driven change with its own priority.
- Confidence stays explainable (single primary source) while evidence is rich.
- The engine is deterministic and network-free, so it is fully unit-testable.
- Heuristic matches carry lower confidence than standards, signalling to the UI
  (and to human reviewers) where to focus review effort.
