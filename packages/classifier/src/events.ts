import type { ContractEvent } from '@semantic-dapp/spec';
import type { OperationDefinition } from '@semantic-dapp/spec';

/**
 * Reduce a name to a comparable stem: lowercase, drop non-alphanumerics, strip a
 * common past-tense / nominalization suffix and a trailing `e`. This lets us line
 * up a *verb* function with the *event* it conventionally emits, e.g.
 * `deposit`↔`Deposit`/`Deposited`, `pause`↔`Paused`, `approve`↔`Approval`,
 * `withdraw`↔`Withdrawal`. Purely conventional and contract-agnostic.
 */
function stem(name: string): string {
  let x = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const suffix of ['ation', 'ed', 'ing', 'al', 'd', 's']) {
    if (x.endsWith(suffix) && x.length - suffix.length >= 3) {
      x = x.slice(0, -suffix.length);
      break;
    }
  }
  if (x.endsWith('e') && x.length > 3) x = x.slice(0, -1);
  return x;
}

const SETTER_EVENT_SUFFIX = /(updated|changed|set)$/;

/**
 * Find an emitted event that conventionally corresponds to a writer function, if
 * any. Two general Solidity conventions:
 *  1. verb ↔ event stem (`deposit`↔`Deposit`), and
 *  2. `setX` ↔ `XUpdated`/`XChanged`/`XSet`.
 */
function matchingEvent(funcName: string, events: ContractEvent[]): string | undefined {
  const fstem = stem(funcName);
  const setter = /^set(.+)/i.exec(funcName);
  const target = setter?.[1]?.toLowerCase();

  for (const ev of events) {
    const evLower = ev.name.toLowerCase();
    if (stem(ev.name) === fstem && fstem.length >= 3) return ev.name;
    if (
      target &&
      target.length >= 2 &&
      evLower.startsWith(target) &&
      SETTER_EVENT_SUFFIX.test(evLower)
    ) {
      return ev.name;
    }
  }
  return undefined;
}

/**
 * Corroborate classified writers with the events the contract declares. When a
 * writer conventionally emits one of the contract's events, that's independent
 * evidence it really performs that state change, so we add an `event` evidence
 * note and nudge confidence up slightly (capped, so strong signals like detected
 * standards are never diluted).
 *
 * Strictly additive and safe: it never changes an operation's type, audience or
 * risk — only its evidence trail and confidence. Absence of an event proves
 * nothing (many functions emit nothing), so we never penalise.
 */
export function corroborateWithEvents(
  operations: OperationDefinition[],
  events: ContractEvent[] | undefined,
): OperationDefinition[] {
  if (!events || events.length === 0) return operations;

  return operations.map((op) => {
    if (op.isRead) return op;
    const name = op.function.slice(0, op.function.indexOf('('));
    const eventName = matchingEvent(name, events);
    if (!eventName) return op;

    return {
      ...op,
      // Only ever raise confidence, and only up to a ceiling — corroboration must
      // never dilute an already-strong signal (e.g. a detected standard at 0.9+).
      confidence: op.confidence >= 0.9 ? op.confidence : Math.min(0.9, op.confidence + 0.05),
      evidence: [
        ...op.evidence,
        {
          source: 'event',
          detail: `Emits ${eventName} — corroborates this state change`,
          weight: 0.05,
        },
      ],
    };
  });
}
