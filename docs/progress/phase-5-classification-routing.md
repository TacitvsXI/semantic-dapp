# Phase 5 - Classification & Routing

Goal (Execution Plan §17.5): turn detection into a **priority-based rule engine**
so every function - not just standard members - gets a meaningful audience, type,
risk and permission. Custom admin setters, fund movements, pausers and claims are
routed instead of dumped to Raw, while standards stay authoritative.

Slice: `RuleContext (model + detected standards + access) → ordered rules
(standard → name/access/risk heuristics → read → fallback) → field-resolved
Classification (audience/type/risk/title/evidence) → OperationDefinition`.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

## `packages/spec`

- [x] Extend `OperationType` with generic buckets: `admin-config`,
      `fund-withdraw`, `fund-deposit`, `claim` (additive, no migration needed)

## `packages/classifier` - rule engine

- [x] `ClassificationRule` / `RuleMatch` / `RuleContext` types
- [x] `runRules(ctx, rules)` - collect matches, resolve each field by
      (priority, confidence), accumulate evidence, never drop a function
- [x] `standardRule` (priority 100) - authoritative Phase-4 semantics
- [x] `nameHeuristicRule` (priority 50) - mint/burn/pause/withdraw/rescue/
      set·update·config/claim/deposit·stake by function name
- [x] `riskHeuristicRule` (priority 40) - payable / destructive names raise risk
- [x] `readRule` (priority 30) - view·pure functions surface in the Read tab
- [x] `fallbackRule` (priority 0) - unknown writer → Raw/Developer (ADR-001)
- [x] Central `permissionFor(audience, type, isRead, access)` post-resolution

## Routing & rendering

- [x] Privileged writers on Ownable/AccessControl contracts route to Admin with
      the correct permission even without a standard match
- [x] Emergency-named actions (pause/emergency*) route to Emergency
- [x] Confidence comes from the highest-priority matching rule; evidence lists
      every contributing rule for transparency

## Tests

- [x] Engine field-resolution unit tests (priority + evidence merge)
- [x] Name heuristics: setFee→admin-config, rescueTokens→fund-withdraw,
      claim→user, pause→emergency (no Pausable standard present)
- [x] Read promotion: a view getter lands in Read (visible, user)
- [x] Regression: all Phase-4 standard routing still holds
- [x] `mergeReviewed` still preserves human edits over the new engine output

## Docs & CI

- [x] ADR-006 - priority rule engine & heuristics
- [x] Update `PROGRESS.md`, `docs/roadmap.md`, backlog
- [x] lint / typecheck / test / build / e2e green

## Definition of done

- [x] A custom Ownable admin contract (setters + rescue + pause) generates a
      populated Admin/Emergency UI with permissions, not an empty semantic view
- [x] Standard contracts classify exactly as in Phase 4
- [x] Every function is still reachable; all checks green
