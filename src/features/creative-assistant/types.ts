import type { AssistantSkillCall } from '@/core/services/ai/assistant-skills';

export type CreativeAssistantMessageRole = 'user' | 'assistant';

export interface CreativeAssistantAttachment {
  id: string;
  name: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  dataUrl: string;
}

export interface GeneratedImageAsset {
  id: string;
  prompt: string;
  previewUrl: string;
  relativePath?: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
}

export interface CreativeAssistantGlossaryEntry {
  term: string;
  meaning: string;
}

/**
 * Structured state emitted by a normal assistant turn.
 * It is a proposal until the user explicitly saves it to project memory.
 */
export interface CreativeAssistantState {
  intent: string;
  target: string;
  constraints: string[];
  confirmedFacts: string[];
  openQuestions: string[];
  glossary: CreativeAssistantGlossaryEntry[];
}

export interface CreativeAssistantMemory extends CreativeAssistantState {
  version: 1;
  updatedAt: string;
}

export type CreativeAssistantAgentStepStatus = 'running' | 'done' | 'failed';

export interface CreativeAssistantAgentStep {
  id: string;
  label: string;
  status: CreativeAssistantAgentStepStatus;
}

export interface CreativeAssistantMessage {
  id: string;
  role: CreativeAssistantMessageRole;
  content: string;
  attachments?: CreativeAssistantAttachment[];
  generatedImages?: GeneratedImageAsset[];
  state?: CreativeAssistantState;
  stateSaved?: boolean;
  thinking?: string;
  skillCalls?: AssistantSkillCall[];
  agentSteps?: CreativeAssistantAgentStep[];
}

export interface CreativeAssistantCandidate<T> {
  raw: string;
  value: T;
}
