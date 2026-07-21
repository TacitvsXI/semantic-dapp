import type { InputWidget, NormalizedParameter } from '@semantic-dapp/spec';
import type { AmountContext, FieldValue } from '../inputs/types.js';
import {
  defaultFieldValue,
  elementType,
  isArrayType,
  isTupleType,
  resolveWidget,
} from '../inputs/widget.js';
import { scalarFeedback } from '../inputs/validate.js';
import { TokenAmountInput } from './TokenAmountInput.js';

export interface InputFieldProps {
  param: NormalizedParameter;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  error?: string;
  /** Hide the field's own label (used by array item rows). */
  hideLabel?: boolean;
  /** Manifest widget hint for this input (overrides the ABI-derived default). */
  widgetHint?: InputWidget;
  /** Token metadata for `token-amount` widgets (decimals / symbol / balance). */
  amount?: AmountContext;
}

/** Dispatch an ABI parameter to the right widget (scalar / tuple / array). */
export function InputField({
  param,
  value,
  onChange,
  error,
  hideLabel,
  widgetHint,
  amount,
}: InputFieldProps) {
  const widget = widgetHint ?? resolveWidget(param);

  const label = hideLabel ? null : (
    <label className="sd-field__label">
      <span className="sd-field__name">{param.name}</span>
      <span className="sd-field__type">{param.type}</span>
    </label>
  );

  const isInteger = /^u?int\d*$/.test(param.type);
  // A `token-amount` hint on an integer renders a human-unit widget, but only
  // when we know the token decimals; otherwise fall back to the raw integer.
  const isTokenAmount = widget === 'token-amount' && isInteger && amount?.decimals !== undefined;

  // Live, as-you-type feedback for scalar leaves (address/int/bytes). Arrays,
  // tuples and bools manage their own children / are always valid. The
  // token-amount widget renders its own inline feedback.
  const isScalar = !isArrayType(param.type) && !isTupleType(param.type) && param.type !== 'bool';
  const feedback =
    isScalar && !isTokenAmount && typeof value === 'string'
      ? scalarFeedback(param.type, value)
      : null;

  let control: React.ReactNode;
  if (isArrayType(param.type)) {
    control = (
      <ArrayInput param={param} value={Array.isArray(value) ? value : []} onChange={onChange} />
    );
  } else if (isTupleType(param.type)) {
    control = (
      <TupleInput param={param} value={Array.isArray(value) ? value : []} onChange={onChange} />
    );
  } else if (param.type === 'bool') {
    control = <BoolInput value={typeof value === 'string' ? value : 'false'} onChange={onChange} />;
  } else if (isTokenAmount) {
    control = (
      <TokenAmountInput
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
        decimals={amount!.decimals!}
        {...(amount?.symbol !== undefined ? { symbol: amount.symbol } : {})}
        {...(amount?.balance !== undefined ? { balance: amount.balance } : {})}
      />
    );
  } else {
    control = (
      <ScalarInput
        param={param}
        widget={widget}
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
        invalid={feedback?.tone === 'error'}
      />
    );
  }

  return (
    <div className="sd-field" data-widget={widget}>
      {label}
      {control}
      {error ? (
        <p className="sd-field__error">{error}</p>
      ) : feedback ? (
        feedback.tone === 'ok' ? (
          <p className="sd-field__ok">
            <span aria-hidden="true">✓</span> {feedback.text}
            {feedback.code ? <code className="sd-field__code">{feedback.code}</code> : null}
          </p>
        ) : (
          <p className="sd-field__warn">{feedback.text}</p>
        )
      ) : null}
    </div>
  );
}

function placeholderFor(type: string): string {
  if (type === 'address') return '0x…';
  if (/^u?int\d*$/.test(type)) return '0';
  if (/^bytes\d*$/.test(type)) return '0x…';
  return '';
}

interface ScalarInputProps {
  param: NormalizedParameter;
  widget: string;
  value: string;
  onChange: (value: FieldValue) => void;
  invalid?: boolean;
}

function ScalarInput({ param, value, onChange, invalid }: ScalarInputProps) {
  return (
    <input
      className="sd-input"
      type="text"
      inputMode={/^u?int\d*$/.test(param.type) ? 'numeric' : 'text'}
      placeholder={placeholderFor(param.type)}
      value={value}
      aria-invalid={invalid ? true : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function BoolInput({ value, onChange }: { value: string; onChange: (v: FieldValue) => void }) {
  return (
    <label className="sd-bool">
      <input
        type="checkbox"
        checked={value === 'true'}
        onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
      />
      <span>{value === 'true' ? 'true' : 'false'}</span>
    </label>
  );
}

interface CompositeInputProps {
  param: NormalizedParameter;
  value: FieldValue[];
  onChange: (value: FieldValue) => void;
}

function TupleInput({ param, value, onChange }: CompositeInputProps) {
  const components = param.components ?? [];
  return (
    <div className="sd-tuple">
      {components.map((component, index) => (
        <InputField
          key={`${component.name}-${index}`}
          param={component}
          value={value[index] ?? defaultFieldValue(component)}
          onChange={(next) => {
            const updated = [...value];
            updated[index] = next;
            onChange(updated);
          }}
        />
      ))}
    </div>
  );
}

function ArrayInput({ param, value, onChange }: CompositeInputProps) {
  const base: NormalizedParameter = { ...param, type: elementType(param.type) };
  const add = () => onChange([...value, defaultFieldValue(base)]);
  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div className="sd-array">
      {value.length === 0 ? <p className="sd-array__empty">No items</p> : null}
      {value.map((item, index) => (
        <div className="sd-array__row" key={index}>
          <span className="sd-array__index">{index}</span>
          <div className="sd-array__control">
            <InputField
              param={base}
              value={item}
              hideLabel
              onChange={(next) => {
                const updated = [...value];
                updated[index] = next;
                onChange(updated);
              }}
            />
          </div>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={() => removeAt(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="sd-btn sd-btn--ghost" onClick={add}>
        + Add {elementType(param.type)}
      </button>
    </div>
  );
}
