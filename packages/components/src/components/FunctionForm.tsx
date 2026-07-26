import { useMemo, useState } from 'react';
import type { ContractFunction, InputWidget } from '@semantic-dapp/spec';
import type { AmountContext, FieldValue } from '../inputs/types.js';
import { defaultFieldValue } from '../inputs/widget.js';
import { encodeInputs } from '../inputs/encode.js';
import { InputField } from './InputField.js';

export interface FunctionFormProps {
  func: ContractFunction;
  /** Called with successfully encoded ABI arguments. */
  onSubmit: (args: unknown[]) => void;
  submitLabel?: string;
  /** A call/transaction is in flight. */
  busy?: boolean;
  /** Submission is blocked (e.g. wallet not connected) but not in flight. */
  disabled?: boolean;
  /** Manifest widget hints, index-aligned with `func.inputs`. */
  hints?: (InputWidget | undefined)[];
  /** Token metadata for `token-amount` widgets. */
  amount?: AmountContext;
  /**
   * Optional secondary action (e.g. "Preview / dry-run") that receives the same
   * validated + encoded args as {@link onSubmit} without submitting.
   */
  onSecondary?: (args: unknown[]) => void;
  secondaryLabel?: string;
  /** The secondary action is in flight. */
  secondaryBusy?: boolean;
}

/**
 * A generic form for a single contract function. Manages per-input state,
 * validates/encodes on submit and surfaces per-field errors — never silently
 * dropping invalid input.
 */
export function FunctionForm({
  func,
  onSubmit,
  submitLabel,
  busy,
  disabled,
  hints,
  amount,
  onSecondary,
  secondaryLabel,
  secondaryBusy,
}: FunctionFormProps) {
  const [values, setValues] = useState<FieldValue[]>(() =>
    func.inputs.map((input) => defaultFieldValue(input)),
  );
  const [errors, setErrors] = useState<(string | undefined)[]>([]);

  const label = useMemo(() => {
    if (submitLabel) return submitLabel;
    return func.isRead ? 'Call' : 'Send transaction';
  }, [submitLabel, func.isRead]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = encodeInputs(func.inputs, values);
    setErrors(result.errors);
    if (result.ok && result.values) {
      onSubmit(result.values);
    }
  };

  const handleSecondary = () => {
    if (!onSecondary) return;
    const result = encodeInputs(func.inputs, values);
    setErrors(result.errors);
    if (result.ok && result.values) {
      onSecondary(result.values);
    }
  };

  return (
    <form className="sd-form" onSubmit={handleSubmit}>
      {func.inputs.length === 0 ? (
        <p className="sd-form__no-inputs">No parameters</p>
      ) : (
        func.inputs.map((input, index) => (
          <InputField
            key={`${input.name}-${index}`}
            param={input}
            value={values[index] ?? defaultFieldValue(input)}
            error={errors[index]}
            {...(hints?.[index] !== undefined ? { widgetHint: hints[index] } : {})}
            {...(amount !== undefined ? { amount } : {})}
            onChange={(next) => {
              setValues((prev) => {
                const updated = [...prev];
                updated[index] = next;
                return updated;
              });
            }}
          />
        ))
      )}
      <div className="sd-form__actions">
        {onSecondary ? (
          <button
            type="button"
            className="sd-btn sd-btn--ghost"
            onClick={handleSecondary}
            disabled={secondaryBusy || busy || disabled}
          >
            {secondaryBusy ? 'Simulating…' : (secondaryLabel ?? 'Preview')}
          </button>
        ) : null}
        <button
          type="submit"
          className={`sd-btn ${func.isRead ? 'sd-btn--read' : 'sd-btn--write'}`}
          disabled={busy || disabled}
        >
          {busy ? 'Working…' : label}
        </button>
      </div>
    </form>
  );
}
