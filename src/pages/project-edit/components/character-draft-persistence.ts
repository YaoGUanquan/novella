import type { Character } from '@/core/script/types/novel';

const STORAGE_PREFIX = 'novella_character_drafts_v1:';

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

function isCharacterDraft(value: unknown): value is Character {
  if (typeof value !== 'object' || value === null) return false;
  const draft = value as Partial<Character>;
  return typeof draft.id === 'string' && typeof draft.name === 'string';
}

export function loadCharacterDrafts(projectId?: string): Character[] {
  if (!projectId || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isCharacterDraft) : [];
  } catch {
    return [];
  }
}

export function saveCharacterDrafts(projectId: string | undefined, drafts: Character[]): void {
  if (!projectId || typeof window === 'undefined') return;
  try {
    if (drafts.length === 0) {
      window.localStorage.removeItem(storageKey(projectId));
      return;
    }
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(drafts));
  } catch {
    // Draft persistence must not interrupt character editing.
  }
}

const OUTLINE_STORAGE_PREFIX = 'novella_outline_draft_v1:';

function outlineStorageKey(projectId: string): string {
  return `${OUTLINE_STORAGE_PREFIX}${projectId}`;
}

export function loadOutlineDraft(projectId?: string): string {
  if (!projectId || typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(outlineStorageKey(projectId))?.trim() ?? '';
  } catch {
    return '';
  }
}

export function saveOutlineDraft(projectId: string | undefined, outline: string): void {
  if (!projectId || typeof window === 'undefined') return;
  try {
    const next = outline.trim();
    if (!next) {
      window.localStorage.removeItem(outlineStorageKey(projectId));
      return;
    }
    window.localStorage.setItem(outlineStorageKey(projectId), next);
  } catch {
    // Outline persistence must not interrupt planning.
  }
}
