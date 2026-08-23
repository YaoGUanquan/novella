import {
  createCreativeAssistantAgent,
  type CreativeAssistantAgentDependencies,
} from '@/core/services/ai/assistant-agent';

type TestState = { intent: string };

type TestCandidate = { name: string };

function createDependencies(
  overrides: Partial<CreativeAssistantAgentDependencies<TestState, TestCandidate>> = {}
) {
  const dialogueRequests: string[] = [];
  const applied: TestCandidate[] = [];
  const persisted: boolean[] = [];
  const imageCalls: string[] = [];
  const deps: CreativeAssistantAgentDependencies<TestState, TestCandidate> = {
    projectId: 'project-a',
    dialogue: {
      stream: async function* (messages, signal) {
        dialogueRequests.push(messages.map((message) => message.content).join('\n'));
        if (signal.aborted) return;
        yield { kind: 'text', text: '回复' };
        yield { kind: 'text', text: '<novella-state>{"intent":"建立角色"}</novella-state>' };
      },
    },
    prompt: {
      buildMessages: ({ selectedSkillIds }) => [
        { role: 'system', content: `skills:${selectedSkillIds.join(',')}` },
        { role: 'user', content: 'request' },
      ],
      parseResponse: (raw) => ({
        content: raw.replace(/<novella-state>[\s\S]*<\/novella-state>/, '').trim(),
        state: raw.includes('novella-state') ? { intent: '建立角色' } : null,
        skillId: null,
      }),
    },
    image: {
      generate: async (prompt) => {
        imageCalls.push(prompt);
        return {
          id: 'image-1',
          prompt,
          previewUrl: 'data:image/png;base64,abc',
          createdAt: '2026-08-23T00:00:00.000Z',
        };
      },
    },
    imageIntent: (value) => value.includes('生成图片'),
    target: {
      parseCandidate: () => ({ name: '林默' }),
      applyCandidate: async (candidate) => {
        applied.push(candidate);
      },
      persist: async () => persisted.shift() ?? true,
    },
    memory: {
      save: jest.fn(),
    },
    ...overrides,
  };
  return { deps, dialogueRequests, applied, persisted, imageCalls };
}

describe('CreativeAssistantAgent', () => {
  it('streams ordered events and gates selected skills', async () => {
    const { deps, dialogueRequests } = createDependencies();
    const agent = createCreativeAssistantAgent<TestState, TestCandidate>(deps);

    const events = [];
    for await (const event of agent.sendTurn({
      text: '确定角色',
      selectedSkillIds: ['ae-ideate'],
    })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual([
      'started',
      'text',
      'text',
      'state',
      'completed',
    ]);
    expect(dialogueRequests[0]).toContain('skills:ae-ideate');
    expect(agent.getSnapshot().memory).toBeNull();
  });

  it('requires explicit confirmation for candidate and memory writes', async () => {
    const { deps, applied, persisted } = createDependencies();
    persisted.push(true);
    const agent = createCreativeAssistantAgent<TestState, TestCandidate>(deps);

    const proposal = agent.createCandidate('raw');
    expect(proposal).toEqual({ raw: 'raw', value: { name: '林默' } });
    expect(applied).toHaveLength(0);

    await expect(agent.applyCandidate()).resolves.toEqual({ status: 'applied' });
    await expect(agent.persistCandidate()).resolves.toEqual({ status: 'saved' });
    expect(applied).toEqual([{ name: '林默' }]);

    await expect(agent.saveMemory({ intent: '建立角色' })).resolves.toEqual({ status: 'saved' });
    expect(deps.memory?.save).toHaveBeenCalledWith('project-a', { intent: '建立角色' });
  });

  it('calls the image adapter only for explicit visual actions', async () => {
    const { deps, imageCalls } = createDependencies();
    const agent = createCreativeAssistantAgent<TestState, TestCandidate>(deps);

    for await (const _event of agent.sendTurn({ text: '这张图是什么风格' })) {
      // consume
    }
    expect(imageCalls).toHaveLength(0);

    const events = [];
    for await (const event of agent.sendTurn({ text: '生成图片：古风角色' })) {
      events.push(event);
    }
    expect(imageCalls).toEqual(['生成图片：古风角色']);
    expect(events.some((event) => event.type === 'image')).toBe(true);
  });

  it('emits failure without applying confirmed data', async () => {
    const { deps, applied } = createDependencies({
      dialogue: {
        stream: async function* () {
          if (process.env.NODE_ENV === 'never') yield { kind: 'text' as const, text: '' };
          throw new Error('transport failed');
        },
      },
    });
    const agent = createCreativeAssistantAgent<TestState, TestCandidate>(deps);
    const events = [];
    for await (const event of agent.sendTurn({ text: '继续' })) {
      events.push(event);
    }

    expect(events.at(-1)).toMatchObject({ type: 'failed' });
    expect(applied).toHaveLength(0);
  });
});
