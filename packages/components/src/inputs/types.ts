/**
 * A form field value tree. Scalars are strings (raw user text); arrays and
 * tuples are nested arrays that mirror the ABI parameter structure.
 */
export type FieldValue = string | FieldValue[];
