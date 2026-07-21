import { useEffect, useMemo, useState } from 'react';
import { SafeText } from '../components/SafeText.js';
import { displayTokenAmount, parseTokenAmount } from '../erc20/amount.js';

export type VaultAction = 'deposit' | 'mint' | 'withdraw' | 'redeem';

interface ActionConfig {
  /** What the user types (assets or shares). */
  inputUnit: 'asset' | 'share';
  /** What the preview returns (the counterpart unit). */
  previewUnit: 'asset' | 'share';
  label: string;
  /** Verb describing the preview result, e.g. "You receive". */
  previewVerb: string;
  submit: string;
}

const ACTIONS: Record<VaultAction, ActionConfig> = {
  deposit: {
    inputUnit: 'asset',
    previewUnit: 'share',
    label: 'Deposit',
    previewVerb: 'You receive',
    submit: 'Deposit',
  },
  mint: {
    inputUnit: 'share',
    previewUnit: 'asset',
    label: 'Mint',
    previewVerb: 'You pay',
    submit: 'Mint',
  },
  withdraw: {
    inputUnit: 'asset',
    previewUnit: 'share',
    label: 'Withdraw',
    previewVerb: 'Burns',
    submit: 'Withdraw',
  },
  redeem: {
    inputUnit: 'share',
    previewUnit: 'asset',
    label: 'Redeem',
    previewVerb: 'You receive',
    submit: 'Redeem',
  },
};

export interface VaultPanelProps {
  name?: string;
  /** Vault share token symbol (e.g. vFIX). */
  shareSymbol?: string;
  /** Underlying asset symbol (e.g. FIX). */
  assetSymbol?: string;
  /** Shared decimals for assets and shares (ERC-4626 mocks use one value). */
  decimals: number;
  totalAssets?: bigint;
  totalSupply?: bigint;
  /** Connected account's vault share balance. */
  shareBalance?: bigint;
  /** Max assets the account can withdraw (from `maxWithdraw`). */
  maxWithdraw?: bigint;
  loading?: boolean;
  /** Which actions have a write in flight. */
  busy?: Partial<Record<VaultAction, boolean>>;
  /** Live preview: given an action + input amount (base units), the counterpart. */
  preview: (action: VaultAction, amount: bigint) => Promise<bigint | undefined>;
  onDeposit: (assets: bigint) => void;
  onMint: (shares: bigint) => void;
  onWithdraw: (assets: bigint) => void;
  onRedeem: (shares: bigint) => void;
}

/**
 * Semantic ERC-4626 vault panel: a segmented Deposit/Mint/Withdraw/Redeem form
 * with human-unit amounts, a live conversion preview (previewDeposit/…), share
 * balances and per-action MAX. Replaces four bare generic forms for vaults.
 */
export function VaultPanel(props: VaultPanelProps) {
  const {
    name,
    shareSymbol,
    assetSymbol,
    decimals,
    totalAssets,
    totalSupply,
    shareBalance,
    maxWithdraw,
    loading,
    busy,
    preview,
    onDeposit,
    onMint,
    onWithdraw,
    onRedeem,
  } = props;

  const [action, setAction] = useState<VaultAction>('deposit');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewValue, setPreviewValue] = useState<bigint | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const config = ACTIONS[action];
  const unitSymbol = (unit: 'asset' | 'share') =>
    unit === 'asset' ? (assetSymbol ?? 'assets') : (shareSymbol ?? 'shares');

  // Reset transient state when switching actions.
  useEffect(() => {
    setAmount('');
    setError(null);
    setPreviewValue(null);
  }, [action]);

  // Debounced live preview as the user types.
  const parsed = useMemo(() => parseTokenAmount(amount, decimals), [amount, decimals]);
  useEffect(() => {
    if (!parsed.ok || parsed.value === undefined || parsed.value === 0n) {
      setPreviewValue(null);
      setPreviewing(false);
      return;
    }
    let cancelled = false;
    setPreviewing(true);
    const handle = setTimeout(() => {
      preview(action, parsed.value!)
        .then((result) => {
          if (cancelled) return;
          setPreviewValue(result ?? null);
          setPreviewing(false);
        })
        .catch(() => {
          if (cancelled) return;
          setPreviewValue(null);
          setPreviewing(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [parsed, action, preview]);

  const maxFor = (a: VaultAction): bigint | undefined => {
    if (a === 'redeem') return shareBalance;
    if (a === 'withdraw') return maxWithdraw;
    return undefined;
  };
  const max = maxFor(action);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!parsed.ok || parsed.value === undefined) {
      setError(parsed.error ?? 'Invalid amount.');
      return;
    }
    if (parsed.value === 0n) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (max !== undefined && parsed.value > max) {
      setError('Amount exceeds the available maximum.');
      return;
    }
    const value = parsed.value;
    if (action === 'deposit') onDeposit(value);
    else if (action === 'mint') onMint(value);
    else if (action === 'withdraw') onWithdraw(value);
    else onRedeem(value);
  };

  const isBusy = busy?.[action] ?? false;

  return (
    <section className="sd-card sd-vault">
      <header className="sd-card__header">
        <div>
          <h3 className="sd-card__title">
            <SafeText value={name} fallback="Vault" maxLength={80} />
          </h3>
          {shareSymbol ? (
            <code className="sd-card__sig">
              <SafeText value={shareSymbol} maxLength={40} />
            </code>
          ) : null}
        </div>
        <span className="sd-badge sd-chip">ERC-4626 Vault</span>
      </header>

      {loading ? <p className="sd-empty">Loading vault state…</p> : null}

      <dl className="sd-vault__stats">
        <div>
          <dt>Total assets</dt>
          <dd>
            {totalAssets !== undefined ? displayTokenAmount(totalAssets, decimals) : '—'}{' '}
            {assetSymbol ?? ''}
          </dd>
        </div>
        <div>
          <dt>Total shares</dt>
          <dd>
            {totalSupply !== undefined ? displayTokenAmount(totalSupply, decimals) : '—'}{' '}
            {shareSymbol ?? ''}
          </dd>
        </div>
        <div>
          <dt>Your shares</dt>
          <dd>
            {shareBalance !== undefined ? displayTokenAmount(shareBalance, decimals) : '—'}{' '}
            {shareSymbol ?? ''}
          </dd>
        </div>
      </dl>

      <div className="sd-vault__tabs" role="tablist">
        {(Object.keys(ACTIONS) as VaultAction[]).map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={action === a}
            className={`sd-vault__tab ${action === a ? 'sd-vault__tab--active' : ''}`}
            onClick={() => setAction(a)}
          >
            {ACTIONS[a].label}
          </button>
        ))}
      </div>

      <form className="sd-token-form" onSubmit={submit}>
        <label className="sd-field">
          <span className="sd-field__name">
            Amount ({unitSymbol(config.inputUnit)})
            {max !== undefined ? (
              <button
                type="button"
                className="sd-btn sd-btn--ghost sd-token-form__max"
                onClick={() => setAmount(displayTokenAmount(max, decimals))}
              >
                max
              </button>
            ) : null}
          </span>
          <input
            className="sd-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            inputMode="decimal"
            aria-invalid={amount.trim() !== '' && !parsed.ok ? true : undefined}
          />
        </label>

        {amount.trim() !== '' && !parsed.ok ? (
          <p className="sd-field__warn">{parsed.error}</p>
        ) : previewing ? (
          <p className="sd-field__hint">Estimating…</p>
        ) : previewValue !== null ? (
          <p className="sd-vault__preview">
            {config.previewVerb} ≈ <strong>{displayTokenAmount(previewValue, decimals)}</strong>{' '}
            {unitSymbol(config.previewUnit)}
          </p>
        ) : null}

        {error ? <p className="sd-field__error">{error}</p> : null}

        <button type="submit" className="sd-btn sd-btn--write" disabled={isBusy}>
          {isBusy ? 'Working…' : config.submit}
        </button>
      </form>
    </section>
  );
}
