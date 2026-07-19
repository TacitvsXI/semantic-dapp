import type { Project } from '../state/project.js';

export interface ProjectListProps {
  projects: Project[];
  onOpen: (project: Project) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function ProjectList({ projects, onOpen, onDelete, onNew }: ProjectListProps) {
  return (
    <div className="studio-list">
      <div className="studio-list__header">
        <h2>Projects</h2>
        <button className="sd-btn sd-btn--write" onClick={onNew}>
          + New import
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="studio-empty">
          No projects yet. Import a contract ABI to generate an interface.
        </p>
      ) : (
        <ul className="studio-list__items">
          {projects.map((project) => (
            <li key={project.id} className="studio-list__item">
              <button className="studio-list__open" onClick={() => onOpen(project)}>
                <span className="studio-list__name">{project.name}</span>
                <span className="studio-list__meta">
                  chain {project.contract.chainId}
                  {project.contract.address ? ` · ${project.contract.address}` : ' · no address'}
                </span>
              </button>
              <button
                className="sd-btn sd-btn--ghost"
                onClick={() => onDelete(project.id)}
                aria-label={`Delete ${project.name}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
