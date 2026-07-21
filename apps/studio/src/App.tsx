import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog, ToastViewport } from '@semantic-dapp/components';
import { ProjectProviders } from './wallet/Providers.js';
import { ImportWizard } from './screens/ImportWizard.js';
import { ProjectList } from './screens/ProjectList.js';
import { ProjectView } from './screens/ProjectView.js';
import { clearHistory } from './state/history.js';
import { deleteProject, getProject, listProjects } from './state/storage.js';
import type { Project } from './state/project.js';

type View = { kind: 'list' } | { kind: 'import' } | { kind: 'project'; id: string };

export function App() {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const refresh = useCallback(() => setProjects(listProjects()), []);
  useEffect(() => refresh(), [refresh]);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    deleteProject(pendingDelete.id);
    clearHistory(pendingDelete.id);
    setPendingDelete(null);
    refresh();
  }, [pendingDelete, refresh]);

  const activeProject = view.kind === 'project' ? getProject(view.id) : undefined;

  return (
    <div className="studio">
      <header className="studio-header">
        <h1 className="studio-header__title">
          Semantic Dapp <span className="studio-header__tag">Studio</span>
        </h1>
        <span className="studio-header__sub">
          Generate a usable interface from any contract ABI
        </span>
      </header>

      <main className="studio-main">
        {view.kind === 'list' ? (
          <ProjectList
            projects={projects}
            onNew={() => setView({ kind: 'import' })}
            onOpen={(p) => setView({ kind: 'project', id: p.id })}
            onDelete={(id) => setPendingDelete(projects.find((p) => p.id === id) ?? null)}
          />
        ) : null}

        {view.kind === 'import' ? (
          <ImportWizard
            onCancel={() => setView({ kind: 'list' })}
            onCreated={(p) => {
              refresh();
              setView({ kind: 'project', id: p.id });
            }}
          />
        ) : null}

        {view.kind === 'project' && activeProject ? (
          <ProjectProviders
            key={`${activeProject.id}:${activeProject.contract.chainId}:${activeProject.rpcUrl}`}
            project={activeProject}
          >
            <ProjectView
              project={activeProject}
              onBack={() => setView({ kind: 'list' })}
              onUpdated={refresh}
            />
          </ProjectProviders>
        ) : null}

        {view.kind === 'project' && !activeProject ? (
          <p className="studio-error">Project not found.</p>
        ) : null}
      </main>

      <footer className="studio-footer">
        Local-first · projects stored in your browser · AGPL-3.0
      </footer>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete project?"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" and its local execution history will be permanently removed from this browser. This cannot be undone.`
            : ''
        }
        risk="high"
        confirmLabel="Delete project"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ToastViewport />
    </div>
  );
}
