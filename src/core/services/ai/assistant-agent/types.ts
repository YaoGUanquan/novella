import type { DialogueStreamEvent } from '@/core/ai/dialogue-stream-events';

export interface AssistantAgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AssistantAgentImage {
  id: string;
  prompt: string;
  previewUrl: string;
  relativePath?: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
}

export interface AssistantTurnRequest {
  text: string;
  selectedSkillIds?: string[];
  attachments?: Array<{ id: string; name: string; mimeType: string; dataUrl: string }>;
  messages?: AssistantAgentMessage[];
}

export interface AssistantAgentResponse<State> {
  content: string;
  state: State | null;
  skillId?: string | null;
}

export interface AssistantAgentSnapshot<State, Candidate> {
  projectId: string;
  messages: AssistantAgentMessage[];
  memory: State | null;
  pendingCandidate: { raw: string; value: Candidate } | null;
  activeTurn: boolean;
}

export type AssistantAgentEvent<State> =
  | { type: 'started'; turnId: string }
  | { type: 'text'; turnId: string; text: string }
  | { type: 'thinking'; turnId: string; text: string }
  | { type: 'state'; turnId: string; state: State }
  | { type: 'image'; turnId: string; image: AssistantAgentImage }
  | { type: 'completed'; turnId: string; content: string; state: State | null }
  | { type: 'cancelled'; turnId: string; content: string }
  | { type: 'failed'; turnId: string; error: Error; content: string };

export interface AssistantDialogueAdapter {
  stream(
    messages: AssistantAgentMessage[],
    signal: AbortSignal
  ): AsyncIterable<DialogueStreamEvent>;
}

export interface AssistantPromptAdapter<State> {
  buildMessages(input: {
    request: AssistantTurnRequest;
    selectedSkillIds: string[];
    memory: State | null;
    messages: AssistantAgentMessage[];
  }): AssistantAgentMessage[];
  parseResponse(raw: string): AssistantAgentResponse<State>;
}

export interface AssistantImageAdapter {
  generate(prompt: string, latestImage?: AssistantAgentImage): Promise<AssistantAgentImage>;
}

export interface AssistantTargetAdapter<Candidate> {
  parseCandidate(raw: string): Candidate;
  applyCandidate(candidate: Candidate): void | Promise<void>;
  persist(): boolean | void | Promise<boolean | void>;
}

export interface AssistantMemoryAdapter<State> {
  save(projectId: string, state: State): void | Promise<void>;
}

export interface CreativeAssistantAgentDependencies<State, Candidate> {
  projectId: string;
  dialogue: AssistantDialogueAdapter;
  prompt: AssistantPromptAdapter<State>;
  image?: AssistantImageAdapter;
  imageIntent?: (text: string) => boolean;
  target?: AssistantTargetAdapter<Candidate>;
  memory?: AssistantMemoryAdapter<State>;
  id?: () => string;
}

export interface AgentActionResult {
  status: 'applied' | 'saved' | 'rejected';
  reason?: string;
}
