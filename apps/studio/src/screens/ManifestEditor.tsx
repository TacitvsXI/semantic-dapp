import { useState } from 'react';
import {
  safeParseManifest,
  type Audience,
  type OperationDefinition,
  type SemanticManifest,
  type Visibility,
} from '@semantic-dapp/spec';

export interface ManifestEditorProps {
  manifest: SemanticManifest;
  onSave: (manifest: SemanticManifest) => void;
  onClose: () => void;
}

type Tab = 'operations' | 'json';

const AUDIENCES: Audience[] = ['user', 'operator', 'admin', 'emergency', 'developer'];
const VISIBILITIES: Visibility[] = ['visible', 'hidden', 'raw-only'];

/** Edit a semantic manifest via a form (per-operation) or raw JSON. */
export function ManifestEditor({ manifest, onSave, onClose }: ManifestEditorProps) {
  const [tab, setTab] = useState<Tab>('operations');
  const [draft, setDraft] = useState<SemanticManifest>(manifest);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(manifest, null, 2));
  const [error, setError] = useState<string | null>(null);

  const updateOp = (id: string, patch: Partial<OperationDefinition>) => {
    setDraft((prev) => ({
      ...prev,
      operations: prev.operations.map((op) =>
        op.id === id ? { ...op, ...patch, reviewed: true } : op,
      ),
    }));
  };

  const applyJson = () => {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
      return;
    }
    const result = safeParseManifest(parsed);
    if (!result.success) {
      setError(
        result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; '),
      );
      return;
    }
    setDraft(result.data);
    setError(null);
  };

  const switchTab = (next: Tab) => {
    if (next === 'json') setJsonText(JSON.stringify(draft, null, 2));
    setTab(next);
    setError(null);
  };

  const save = () => {
    // In JSON tab, apply pending text first.
    const source =
      tab === 'json'
        ? (() => {
            try {
              return safeParseManifest(JSON.parse(jsonText));
            } catch (e) {
              return {
                success: false as const,
                error: { issues: [{ path: [], message: (e as Error).message }] },
              };
            }
          })()
        : safeParseManifest(draft);
    if (!source.success) {
      setError('Fix validation errors before saving.');
      return;
    }
    onSave(source.data);
  };

  return (
    <div className="studio-editor">
      <div className="studio-editor__head">
        <h3>Edit manifest</h3>
        <div className="sd-tabs" role="tablist">
          <button
            role="tab"
            className={`sd-tab ${tab === 'operations' ? 'sd-tab--active' : ''}`}
            aria-selected={tab === 'operations'}
            onClick={() => switchTab('operations')}
          >
            Operations
          </button>
          <button
            role="tab"
            className={`sd-tab ${tab === 'json' ? 'sd-tab--active' : ''}`}
            aria-selected={tab === 'json'}
            onClick={() => switchTab('json')}
          >
            JSON
          </button>
        </div>
      </div>

      {tab === 'operations' ? (
        <div className="studio-editor__ops">
          {draft.operations.map((op) => (
            <div key={op.id} className="studio-editor__op">
              <code className="studio-editor__sig">{op.function}</code>
              <div className="studio-field-row">
                <label className="studio-field">
                  <span>Title</span>
                  <input
                    value={op.title}
                    onChange={(e) => updateOp(op.id, { title: e.target.value })}
                  />
                </label>
                <label className="studio-field">
                  <span>Description</span>
                  <input
                    value={op.description ?? ''}
                    onChange={(e) => updateOp(op.id, { description: e.target.value })}
                  />
                </label>
              </div>
              <div className="studio-field-row">
                <label className="studio-field">
                  <span>Audience</span>
                  <select
                    value={op.audience}
                    onChange={(e) => updateOp(op.id, { audience: e.target.value as Audience })}
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="studio-field">
                  <span>Visibility</span>
                  <select
                    value={op.visibility}
                    onChange={(e) => updateOp(op.id, { visibility: e.target.value as Visibility })}
                  >
                    {VISIBILITIES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="studio-editor__json">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={20}
            spellCheck={false}
          />
          <button className="sd-btn sd-btn--read" onClick={applyJson}>
            Validate &amp; apply JSON
          </button>
        </div>
      )}

      {error ? <p className="studio-error">{error}</p> : null}

      <div className="studio-editor__actions">
        <button className="sd-btn" onClick={onClose}>
          Cancel
        </button>
        <button className="sd-btn sd-btn--write" onClick={save}>
          Save manifest
        </button>
      </div>
    </div>
  );
}
