import type { Project } from './project.js';

const STORAGE_KEY = 'semantic-dapp:projects:v1';

function read(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function listProjects(): Project[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Project | undefined {
  return read().find((p) => p.id === id);
}

export function saveProject(project: Project): void {
  const projects = read();
  const index = projects.findIndex((p) => p.id === project.id);
  const next = { ...project, updatedAt: Date.now() };
  if (index >= 0) projects[index] = next;
  else projects.push(next);
  write(projects);
}

export function deleteProject(id: string): void {
  write(read().filter((p) => p.id !== id));
}

export function newProjectId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
