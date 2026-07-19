# ADR-001: Deterministic-first architecture

- Status: Accepted
- Date: 2026-07-19

## Context

Semantic Dapp must turn arbitrary EVM contracts into usable interfaces. There is
a temptation to lean on a generative model to "understand" contracts. However,
users execute real, sometimes irreversible, on-chain transactions based on what
the interface tells them. Incorrect or hallucinated classifications are unsafe.

## Decision

Recognition of known standards, roles, risks and UI patterns is done by
**deterministic detectors and rules** operating on ABI, selectors, inheritance,
modifiers, NatSpec and (when available) verified source.

- AI is an **optional, later** layer that may _propose_ classifications for
  unknown functions. Its output is schema-validated and always marked as
  suggestion.
- AI never signs transactions and never hides uncertainty.
- If meaning is not proven above the confidence threshold, the function falls
  back to the **Raw / Developer** UI with an explicit warning.
- Nothing is lost: every ABI function stays reachable in the raw view.

## Consequences

- The analyzer and classifier packages contain explicit, testable rules with
  evidence objects and confidence scores.
- The first release ships without any required AI dependency.
- Confidence thresholds (documented in the analyzer) drive routing:
  `0.90+` auto-confirmed, `0.70-0.89` suggested, `0.40-0.69` developer review,
  `< 0.40` raw-only.
