/**
 * A form field value tree. Scalars are strings (raw user text); arrays and
 * tuples are nested arrays that mirror the ABI parameter structure.
 */
export type FieldValue = string | FieldValue[];

/**
 * Token metadata used to render `token-amount` widgets in human units. Supplied
 * per-contract (the `self` token) so an amount input can convert to/from base
 * units, offer MAX, and show a balance hint.
 */
export interface AmountContext {
  decimals?: number;
  symbol?: string;
  /** Connected account balance in base units, used for the MAX shortcut. */
  balance?: bigint;
}
