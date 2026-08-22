import { parseStoredAgentSteps } from './agent-timeline';
import {
  normalizeCreativeAssistantState,
  parseCreativeAssistantResponse,
} from './creative-assistant-memory';
import type { CreativeAssistantAgentStep, CreativeAssistantMessage } from './types';

const STORAGE_PREFIX = 'novella_creative_assistant_session_v1:';

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

function parseStoredMessage(value: unknown): CreativeAssistantMessage | null {
  if (typeof value !== 'object' || value === null) return null;
  const message = value as Partial<CreativeAssistantMessage>;
  if (
    typeof message.id !== 'string' ||
    (message.role !== 'user' && message.role !== 'assistant') ||
    typeof message.content !== 'string'
  ) {
    return null;
  }
  const parsed =
    message.role === 'assistant'
      ? parseCreativeAssistantResponse(message.content)
      : { content: message.content, state: null };
  const state = parsed.state ?? normalizeCreativeAssistantState(message.state);
  const agentSteps = parseStoredAgentSteps((message as { agentSteps?: unknown }).agentSteps);
  return {
    id: message.id,
    role: message.role,
    content: parsed.content,
    ...(state ? { state } : {}),
    ...(message.stateSaved ? { stateSaved: true } : {}),
    ...(agentSteps ? { agentSteps } : {}),
  };
}

export function loadCreativeAssistantSession(projectId?: string): CreativeAssistantMessage[] {
  if (!projectId || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.flatMap((item) => {
          const message = parseStoredMessage(item);
          return message ? [message] : [];
        })
      : [];
  } catch {
    return [];
  }
}

export function saveCreativeAssistantSession(
  projectId: string | undefined,
  messages: CreativeAssistantMessage[]
): void {
  if (!projectId || typeof window === 'undefined') return;
  try {
    // File data can exceed storage quotas; attachments remain in the active dialog only.
    const persisted = messages.map(({ id, role, content, state, stateSaved, agentSteps }) => ({
      id,
      role,
      content,
      ...(state ? { state } : {}),
      ...(stateSaved ? { stateSaved: true } : {}),
      ...(agentSteps?.length
        ? {
            agentSteps: agentSteps.map((step: CreativeAssistantAgentStep) => ({
              id: step.id,
              label: step.label,
              status: step.status,
            })),
          }
        : {}),
    }));
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(persisted));
  } catch {
    // Conversation persistence is optional and must not interrupt creation.
  }
}
