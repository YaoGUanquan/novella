import {
  assistantUIReducer,
  createAssistantUIState,
  type AssistantUIState,
} from '@/features/creative-assistant/creative-assistant-ui-reducer';
import type {
  CreativeAssistantMemory,
  CreativeAssistantMessage,
} from '@/features/creative-assistant/types';

type Candidate = { name: string };

const memory: CreativeAssistantMemory = {
  version: 1,
  intent: '完成角色设定',
  target: '角色',
  constraints: [],
  confirmedFacts: ['项目名已确认'],
  openQuestions: [],
  glossary: [],
  updatedAt: '2026-08-23T00:00:00.000Z',
};

function assistantMessage(id: string, content = ''): CreativeAssistantMessage {
  return { id, role: 'assistant', content };
}

describe('assistantUIReducer', () => {
  it('keeps a newer turn active when an older terminal event arrives', () => {
    let state = createAssistantUIState<Candidate>();
    state = assistantUIReducer(state, {
      type: 'turn-started',
      assistantId: 'turn-a',
      message: assistantMessage('turn-a'),
    });
    state = assistantUIReducer(state, {
      type: 'turn-started',
      assistantId: 'turn-b',
      message: assistantMessage('turn-b'),
    });
    state = assistantUIReducer(state, {
      type: 'turn-completed',
      assistantId: 'turn-a',
      content: '旧回复',
    });

    expect(state.generating).toBe(true);
    expect(state.streamingMessageId).toBe('turn-b');
    expect(state.messages.find((message) => message.id === 'turn-a')?.content).toBe('');
  });

  it('hydrates atomically and clears transcript state without deleting memory', () => {
    const hydrated: AssistantUIState<Candidate> = assistantUIReducer(
      createAssistantUIState<Candidate>(),
      {
        type: 'hydrate',
        messages: [assistantMessage('saved', '历史回复')],
        memory,
      }
    );
    const withPending = assistantUIReducer(hydrated, {
      type: 'candidate-parsed',
      raw: '{"name":"林默"}',
      value: { name: '林默' },
    });
    const cleared = assistantUIReducer(withPending, { type: 'conversation-cleared' });

    expect(cleared.messages).toEqual([]);
    expect(cleared.candidate).toBeNull();
    expect(cleared.error).toBe('');
    expect(cleared.memory).toEqual(memory);
    expect(cleared.conversationVersion).toBe(1);
  });

  it('keeps candidate and memory transitions independent', () => {
    let state = createAssistantUIState<Candidate>();
    state = assistantUIReducer(state, {
      type: 'candidate-parsed',
      raw: 'raw',
      value: { name: '林默' },
    });
    state = assistantUIReducer(state, { type: 'memory-updated', memory });
    state = assistantUIReducer(state, {
      type: 'message-state-saved',
      messageId: 'turn-a',
    });

    expect(state.candidate).toEqual({ raw: 'raw', value: { name: '林默' } });
    expect(state.memory).toEqual(memory);
    expect(state.messages).toEqual([]);
  });

  it('does not append the same external image twice in one event batch', () => {
    const image = {
      id: 'image-1',
      prompt: 'prompt',
      previewUrl: 'blob:image-1',
      relativePath: 'images/image-1.png',
      createdAt: '2026-08-23T00:00:00.000Z',
    };
    const state = assistantUIReducer(createAssistantUIState<Candidate>(), {
      type: 'external-images-added',
      images: [image, image],
    });

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].generatedImages?.[0].id).toBe('image-1');
  });

  it('commits an active failure atomically and resets conversation version on hydration', () => {
    let state = assistantUIReducer(createAssistantUIState<Candidate>(), {
      type: 'conversation-cleared',
    });
    state = assistantUIReducer(state, {
      type: 'turn-started',
      assistantId: 'turn-a',
      message: assistantMessage('turn-a'),
    });
    state = assistantUIReducer(state, {
      type: 'turn-failed',
      assistantId: 'turn-a',
      error: 'request failed',
      content: 'incomplete',
    });

    expect(state.generating).toBe(false);
    expect(state.streamingMessageId).toBeNull();
    expect(state.error).toBe('request failed');
    expect(state.messages[0].content).toBe('incomplete');

    state = assistantUIReducer(state, { type: 'hydrate', messages: [], memory });
    expect(state.conversationVersion).toBe(0);
  });
});
