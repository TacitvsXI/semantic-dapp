import { describe, it, expect, beforeEach } from 'vitest';
import { clearToasts, dismissToast, getToasts, pushToast, subscribeToasts } from './toast-store.js';

describe('toast store', () => {
  beforeEach(() => clearToasts());

  it('pushes a toast with defaults and returns its id', () => {
    const id = pushToast({ title: 'Hello' });
    const toasts = getToasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ id, title: 'Hello', kind: 'info' });
    expect(toasts[0]!.duration).toBeGreaterThan(0);
  });

  it('replaces a toast with the same id instead of stacking (tx submitted → confirmed)', () => {
    pushToast({ id: 'tx-1', kind: 'info', title: 'Transaction submitted' });
    pushToast({ id: 'tx-1', kind: 'success', title: 'Transaction confirmed' });
    const toasts = getToasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({
      id: 'tx-1',
      kind: 'success',
      title: 'Transaction confirmed',
    });
  });

  it('dismisses a toast by id', () => {
    const id = pushToast({ title: 'Bye' });
    dismissToast(id);
    expect(getToasts()).toHaveLength(0);
  });

  it('notifies subscribers on change', () => {
    let calls = 0;
    const unsub = subscribeToasts(() => {
      calls += 1;
    });
    pushToast({ title: 'A' });
    pushToast({ title: 'B' });
    unsub();
    pushToast({ title: 'C' });
    expect(calls).toBe(2);
  });

  it('gives errors a longer default duration than info', () => {
    const infoId = pushToast({ kind: 'info', title: 'i' });
    const errId = pushToast({ kind: 'error', title: 'e' });
    const info = getToasts().find((t) => t.id === infoId)!;
    const err = getToasts().find((t) => t.id === errId)!;
    expect(err.duration).toBeGreaterThan(info.duration);
  });
});
