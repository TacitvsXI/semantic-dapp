import type { NormalizedParameter } from '@semantic-dapp/spec';
import { inputWidgetForType, isArrayType, isTupleType, elementType } from '@semantic-dapp/spec';
import type { FieldValue } from './types.js';

export { isArrayType, isTupleType, elementType };

/** Pick a default UI widget for an ABI parameter type. */
export const resolveWidget = inputWidgetForType;

/** Build an empty {@link FieldValue} tree for a parameter. */
export function defaultFieldValue(param: NormalizedParameter): FieldValue {
  const { type } = param;
  if (isArrayType(type)) return [];
  if (isTupleType(type)) {
    return (param.components ?? []).map((c) => defaultFieldValue(c));
  }
  if (type === 'bool') return 'false';
  return '';
}
