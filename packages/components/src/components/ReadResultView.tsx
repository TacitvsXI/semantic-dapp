import type { DisplayValue, FormattedOutput } from '@semantic-dapp/execution';

export interface ReadResultViewProps {
  result: FormattedOutput[];
}

function renderValue(value: DisplayValue): React.ReactNode {
  if (Array.isArray(value)) {
    return (
      <ul className="sd-result__list">
        {value.map((item, index) => (
          <li key={index}>{renderValue(item)}</li>
        ))}
      </ul>
    );
  }
  if (value !== null && typeof value === 'object') {
    return (
      <dl className="sd-result__object">
        {Object.entries(value).map(([key, val]) => (
          <div key={key} className="sd-result__object-row">
            <dt>{key}</dt>
            <dd>{renderValue(val)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <code className="sd-result__scalar">{value === '' ? '∅' : value}</code>;
}

/** Render a formatted read result. */
export function ReadResultView({ result }: ReadResultViewProps) {
  if (result.length === 0) {
    return <p className="sd-result sd-result--empty">No return value</p>;
  }
  return (
    <div className="sd-result">
      {result.map((output, index) => (
        <div className="sd-result__row" key={index}>
          <span className="sd-result__name">
            {output.name}
            <span className="sd-result__type">{output.type}</span>
          </span>
          {renderValue(output.value)}
        </div>
      ))}
    </div>
  );
}
