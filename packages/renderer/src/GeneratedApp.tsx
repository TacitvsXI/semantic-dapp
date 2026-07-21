import { useMemo, useState } from 'react';
import type { ContractModel, SemanticManifest } from '@semantic-dapp/spec';
import type { ContractRuntime } from './runtime.js';
import { buildSections, groupOperations, type SectionId } from './sections.js';
import {
  OperationCard,
  RawFunctionCard,
  type ReviewControls,
  type SafetyContext,
} from './OperationCard.js';
import { TokenActions } from './TokenActions.js';
import { OverviewSummary } from './OverviewSummary.js';
import { ReadDataGrid } from './ReadDataGrid.js';
import { PausePanelHost } from './panels/PausePanelHost.js';
import { RoleManagerHost } from './panels/RoleManagerHost.js';

/** ERC-20 transfer/approve are shown by TokenActions; hide the duplicate cards. */
const ERC20_USER_PANEL_SIGNATURES = new Set([
  'transfer(address,uint256)',
  'approve(address,uint256)',
]);

export interface GeneratedAppProps {
  manifest: SemanticManifest;
  model: ContractModel;
  runtime: ContractRuntime;
  contractId?: string;
  review?: ReviewControls;
  /** Contract-level safety signals used for preflight write warnings. */
  safety?: { verified?: boolean; stale?: boolean };
}

/**
 * The generated application: audience tabs (User/Admin/Emergency/Read) driven by
 * the semantic manifest, plus an always-present Raw tab listing every ABI
 * function. Each function's confidence and evidence are shown inline.
 */
export function GeneratedApp({
  manifest,
  model,
  runtime,
  contractId,
  review,
  safety,
}: GeneratedAppProps) {
  const layout = useMemo(
    () => buildSections(manifest, model, contractId),
    [manifest, model, contractId],
  );

  const activeContract = contractId
    ? manifest.contracts.find((c) => c.id === contractId)
    : manifest.contracts[0];
  const isErc20 = activeContract?.standards.includes('erc-20') ?? false;

  const safetyContext: SafetyContext = {
    ...(activeContract?.chainId !== undefined ? { contractChainId: activeContract.chainId } : {}),
    ...(safety?.verified !== undefined ? { verified: safety.verified } : {}),
    ...(safety?.stale !== undefined ? { stale: safety.stale } : {}),
  };

  const tabs: { id: SectionId; title: string; count: number }[] = [
    ...layout.sections.map((s) => ({ id: s.id, title: s.title, count: s.operations.length })),
    { id: 'raw' as const, title: 'Raw', count: layout.rawFunctions.length },
  ];

  const [active, setActive] = useState<SectionId>(tabs[0]?.id ?? 'raw');

  const rawReads = layout.rawFunctions.filter((f) => f.isRead);
  const rawWrites = layout.rawFunctions.filter((f) => !f.isRead);

  return (
    <div className="sd-app">
      <OverviewSummary
        manifest={manifest}
        layout={layout}
        runtime={runtime}
        contractId={contractId}
      />

      <nav className="sd-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            className={`sd-tab ${active === tab.id ? 'sd-tab--active' : ''}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.title}
            <span className="sd-tab__count">{tab.count}</span>
          </button>
        ))}
      </nav>

      <div className="sd-tabpanel" role="tabpanel">
        {active === 'raw' ? (
          <div className="sd-raw">
            <h2 className="sd-raw__group-title">Read</h2>
            {rawReads.length === 0 ? <p className="sd-empty">No read functions</p> : null}
            {rawReads.map((func) => (
              <RawFunctionCard key={func.selector} func={func} runtime={runtime} />
            ))}
            <h2 className="sd-raw__group-title">Write</h2>
            {rawWrites.length === 0 ? <p className="sd-empty">No write functions</p> : null}
            {rawWrites.map((func) => (
              <RawFunctionCard key={func.selector} func={func} runtime={runtime} />
            ))}
          </div>
        ) : (
          layout.sections
            .filter((section) => section.id === active)
            .map((section) => {
              const showTokenActions = section.id === 'user' && isErc20;
              const isReadSection = section.id === 'read';
              const { pause, roles, rest } = groupOperations(section.operations);
              let cards = showTokenActions
                ? rest.filter((v) => !ERC20_USER_PANEL_SIGNATURES.has(v.operation.function))
                : rest;
              // No-arg getters are shown together in the live data grid; keep
              // only parametrized reads (e.g. balanceOf) as individual forms.
              if (isReadSection) {
                cards = cards.filter(
                  (v) => !(v.func && v.func.isRead && v.func.inputs.length === 0),
                );
              }
              return (
                <div key={section.id} className="sd-section">
                  {showTokenActions ? <TokenActions model={model} runtime={runtime} /> : null}
                  {isReadSection ? <ReadDataGrid model={model} runtime={runtime} /> : null}
                  {pause.length > 0 ? <PausePanelHost model={model} runtime={runtime} /> : null}
                  {roles.length > 0 ? <RoleManagerHost model={model} runtime={runtime} /> : null}
                  {cards.map((view) => (
                    <OperationCard
                      key={view.operation.id}
                      view={view}
                      runtime={runtime}
                      review={review}
                      safety={safetyContext}
                    />
                  ))}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
