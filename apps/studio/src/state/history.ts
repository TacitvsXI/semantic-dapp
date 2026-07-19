import type { AuditEntry } from '@semantic-dapp/components';

const STORAGE_PREFIX = 'semantic-dapp:history:v1:';
const MAX_ENTRIES = 200;

function keyFor(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

/** Load a project's execution history, newest first. */
export function loadHistory(projectId: string): AuditEntry[] {
  try {
    const raw = localStorage.getItem(keyFor(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Append an entry (capped, newest first) and return the updated list. */
export function appendHistory(projectId: string, entry: AuditEntry): AuditEntry[] {
  const next = [entry, ...loadHistory(projectId)].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(keyFor(projectId), JSON.stringify(next));
  } catch {
    /* storage full or unavailable — history is best-effort */
  }
  return next;
}

/** Clear a project's execution history. */
export function clearHistory(projectId: string): void {
  try {
    localStorage.removeItem(keyFor(projectId));
  } catch {
    /* ignore */
  }
}

/** Build a unique id for a new audit entry. */
export function newEntryId(): string {
  return `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
