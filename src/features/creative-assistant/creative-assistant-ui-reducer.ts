import type { AssistantSkillCall } from '@/core/services/ai/assistant-skills';

import type {
  CreativeAssistantCandidate,
  CreativeAssistantMemory,
  CreativeAssistantMessage,
  CreativeAssistantState,
  GeneratedImageAsset,
  CreativeAssistantAgentStep,
} from './types';

export interface AssistantUIState<Candidate> {
  messages: CreativeAssistantMessage[];
  memory: CreativeAssistantMemory;
  candidate: CreativeAssistantCandidate<Candidate> | null;
  candidateRaw: string | null;
  error: string;
  generating: boolean;
  streamingMessageId: string | null;
  conversationVersion: number;
  sessionReady: boolean;
  memoryReady: boolean;
}

export type AssistantUIAction<Candidate> =
  | {
      type: 'hydrate';
      messages: CreativeAssistantMessage[];
      memory: CreativeAssistantMemory;
    }
  | {
      type: 'external-images-added';
      images: GeneratedImageAsset[];
    }
  | { type: 'message-added'; message: CreativeAssistantMessage }
  | { type: 'message-removed'; messageId: string }
  | {
      type: 'turn-started';
      assistantId: string;
      message: CreativeAssistantMessage;
      agentSteps?: CreativeAssistantAgentStep[];
    }
  | {
      type: 'assistant-patched';
      assistantId: string;
      patch: Partial<CreativeAssistantMessage>;
    }
  | {
      type: 'turn-completed';
      assistantId: string;
      content: string;
      error?: string;
      state?: CreativeAssistantState | null;
      skillCalls?: AssistantSkillCall[];
      agentSteps?: CreativeAssistantAgentStep[];
    }
  | { type: 'turn-cancelled'; assistantId: string; agentSteps?: CreativeAssistantAgentStep[] }
  | {
      type: 'turn-failed';
      assistantId: string;
      error: string;
      content?: string;
      agentSteps?: CreativeAssistantAgentStep[];
    }
  | { type: 'error-cleared' }
  | { type: 'error-set'; error: string }
  | { type: 'candidate-cleared' }
  | { type: 'candidate-raw'; raw: string }
  | { type: 'candidate-parsed'; raw: string; value: Candidate }
  | { type: 'memory-updated'; memory: CreativeAssistantMemory }
  | { type: 'message-state-saved'; messageId: string }
  | { type: 'conversation-cleared' }
  | { type: 'project-memory-cleared' };

function appendExternalImages(
  messages: CreativeAssistantMessage[],
  images: GeneratedImageAsset[]
): CreativeAssistantMessage[] {
  const existingIds = new Set(
    messages.flatMap((message) => message.generatedImages?.map((image) => image.id) ?? [])
  );
  return [
    ...messages,
    ...images
      .filter(
        (image, index, all) =>
          !existingIds.has(image.id) &&
          all.findIndex((candidate) => candidate.id === image.id) === index
      )
      .map(
        (image): CreativeAssistantMessage => ({
          id: `external-${image.id}`,
          role: 'assistant',
          content: '参考图已生成，可继续在对话中描述需要调整的内容。',
          generatedImages: [image],
        })
      ),
  ];
}

export function createAssistantUIState<Candidate>(): AssistantUIState<Candidate> {
  return {
    messages: [],
    memory: {
      version: 1,
      intent: '',
      target: '',
      constraints: [],
      confirmedFacts: [],
      openQuestions: [],
      glossary: [],
      updatedAt: '',
    },
    candidate: null,
    candidateRaw: null,
    error: '',
    generating: false,
    streamingMessageId: null,
    conversationVersion: 0,
    sessionReady: false,
    memoryReady: false,
  };
}

function finishTurn<Candidate>(
  state: AssistantUIState<Candidate>,
  assistantId: string,
  patch: Partial<AssistantUIState<Candidate>>
): AssistantUIState<Candidate> {
  if (state.streamingMessageId !== assistantId) return state;
  return {
    ...state,
    ...patch,
    generating: false,
    streamingMessageId: null,
  };
}

export function assistantUIReducer<Candidate>(
  state: AssistantUIState<Candidate>,
  action: AssistantUIAction<Candidate>
): AssistantUIState<Candidate> {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        messages: action.messages,
        memory: action.memory,
        candidate: null,
        candidateRaw: null,
        error: '',
        generating: false,
        streamingMessageId: null,
        conversationVersion: 0,
        sessionReady: true,
        memoryReady: true,
      };
    case 'external-images-added':
      return { ...state, messages: appendExternalImages(state.messages, action.images) };
    case 'message-added':
      return { ...state, messages: [...state.messages, action.message] };
    case 'message-removed':
      return {
        ...state,
        messages: state.messages.filter((message) => message.id !== action.messageId),
        error: '',
      };
    case 'turn-started':
      return {
        ...state,
        messages: state.messages.some((message) => message.id === action.assistantId)
          ? state.messages.map((message) =>
              message.id === action.assistantId
                ? { ...message, ...action.message, agentSteps: action.agentSteps }
                : message
            )
          : [...state.messages, { ...action.message, agentSteps: action.agentSteps }],
        generating: true,
        streamingMessageId: action.assistantId,
        error: '',
      };
    case 'assistant-patched':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.assistantId ? { ...message, ...action.patch } : message
        ),
      };
    case 'turn-completed':
      return finishTurn(state, action.assistantId, {
        messages: state.messages.map((message) =>
          message.id === action.assistantId
            ? {
                ...message,
                content: action.content,
                ...(action.state ? { state: action.state } : {}),
                ...(action.skillCalls ? { skillCalls: action.skillCalls } : {}),
                ...(action.agentSteps ? { agentSteps: action.agentSteps } : {}),
                thinking: undefined,
              }
            : message
        ),
        error: action.error ?? '',
      });
    case 'turn-cancelled':
      return finishTurn(state, action.assistantId, {
        messages: state.messages.map((message) =>
          message.id === action.assistantId && action.agentSteps
            ? { ...message, agentSteps: action.agentSteps }
            : message
        ),
      });
    case 'turn-failed':
      return finishTurn(state, action.assistantId, {
        messages: state.messages.map((message) =>
          message.id === action.assistantId
            ? {
                ...message,
                content: action.content ?? message.content,
                ...(action.agentSteps ? { agentSteps: action.agentSteps } : {}),
              }
            : message
        ),
        error: action.error,
      });
    case 'error-cleared':
      return { ...state, error: '' };
    case 'error-set':
      return { ...state, error: action.error };
    case 'candidate-cleared':
      return { ...state, candidate: null, candidateRaw: null };
    case 'candidate-raw':
      return { ...state, candidateRaw: action.raw };
    case 'candidate-parsed':
      return {
        ...state,
        candidateRaw: action.raw,
        candidate: { raw: action.raw, value: action.value },
        error: '',
      };
    case 'memory-updated':
      return { ...state, memory: action.memory };
    case 'message-state-saved':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.messageId ? { ...message, stateSaved: true } : message
        ),
      };
    case 'conversation-cleared':
      return {
        ...state,
        messages: [],
        candidate: null,
        candidateRaw: null,
        error: '',
        generating: false,
        streamingMessageId: null,
        conversationVersion: state.conversationVersion + 1,
      };
    case 'project-memory-cleared':
      return {
        ...state,
        memory: { ...createAssistantUIState<Candidate>().memory },
        messages: state.messages.map(({ stateSaved: _stateSaved, ...message }) => message),
      };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
