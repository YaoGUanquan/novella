import {
  resolveDialogueTransportEndpoint,
  saveServiceConnection,
} from '@/core/config/ai-connection-settings';
import { aiService } from '@/core/services';
import { ConfiguredDialogueError } from '@/core/services/ai/text/ai-service';

describe('configured dialogue streaming', () => {
  const originalFetch = global.fetch;
  const originalProxyFlag = globalThis.NOVELLA_VITE_DIALOGUE_PROXY_ENABLED;

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
    globalThis.NOVELLA_VITE_DIALOGUE_PROXY_ENABLED = originalProxyFlag;
  });

  it('uses the saved dialogue endpoint, key, model, and OpenAI-compatible stream contract', async () => {
    await saveServiceConnection({
      kind: 'dialogue',
      baseUrl: 'https://dialogue.example/v1',
      apiKey: 'test-dialogue-key',
      model: 'custom-dialogue-model',
      enabled: true,
    });
    const encoder = new TextEncoder();
    const read = jest
      .fn()
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: {"choices":[{"delta":{"content":"你好"}}]}\n\n'),
      })
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: [DONE]\n\n'),
      })
      .mockResolvedValueOnce({ done: true, value: undefined });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => ({ read, releaseLock: jest.fn() }) },
    });
    global.fetch = fetchMock as typeof fetch;

    const output: string[] = [];
    for await (const chunk of aiService.streamConfiguredDialogue([
      { role: 'system', content: '你是创作助手。' },
      { role: 'user', content: '请帮助我梳理角色。' },
    ])) {
      output.push(chunk);
    }

    expect(output.join('')).toBe('你好');
    expect(fetchMock.mock.calls[0][0]).toBe('https://dialogue.example/v1/chat/completions');
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer test-dialogue-key',
      })
    );
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual(
      expect.objectContaining({
        model: 'custom-dialogue-model',
        stream: true,
      })
    );
  });

  it('keeps thinking events out of the string dialogue stream', async () => {
    await saveServiceConnection({
      kind: 'dialogue',
      baseUrl: 'https://dialogue.example/v1',
      apiKey: 'test-dialogue-key',
      model: 'custom-dialogue-model',
      enabled: true,
    });
    const encoder = new TextEncoder();
    const frames = [
      'data: {"choices":[{"delta":{"reasoning_content":"先分析角色"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"建议加强动机"}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    const createReader = () => {
      let index = 0;
      return {
        read: jest.fn().mockImplementation(async () => {
          if (index >= frames.length) return { done: true, value: undefined };
          const value = encoder.encode(frames[index]);
          index += 1;
          return { done: false, value };
        }),
        releaseLock: jest.fn(),
      };
    };
    global.fetch = jest.fn().mockImplementation(async () => ({
      ok: true,
      body: { getReader: createReader },
    })) as typeof fetch;

    const text: string[] = [];
    for await (const chunk of aiService.streamConfiguredDialogue([
      { role: 'user', content: '梳理角色' },
    ])) {
      text.push(chunk);
    }
    const events: Array<{ kind: string; text: string }> = [];
    for await (const event of aiService.streamConfiguredDialogueEvents([
      { role: 'user', content: '梳理角色' },
    ])) {
      events.push(event);
    }

    expect(text.join('')).toBe('建议加强动机');
    expect(events).toEqual([
      { kind: 'thinking', text: '先分析角色' },
      { kind: 'text', text: '建议加强动机' },
    ]);
  });

  it('returns a sanitized HTTP failure without exposing the configured key', async () => {
    await saveServiceConnection({
      kind: 'dialogue',
      baseUrl: 'https://dialogue.example/v1',
      apiKey: 'secret-key-must-not-appear',
      model: 'custom-dialogue-model',
      enabled: true,
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as typeof fetch;

    const stream = aiService.streamConfiguredDialogue([{ role: 'user', content: 'hello' }]);
    await expect(stream.next()).rejects.toEqual(
      expect.objectContaining({
        name: 'ConfiguredDialogueError',
        kind: 'http',
        host: 'dialogue.example',
        status: 401,
      } satisfies Partial<ConfiguredDialogueError>)
    );
  });

  it('classifies a failed fetch as a transport failure without exposing the configured key', async () => {
    await saveServiceConnection({
      kind: 'dialogue',
      baseUrl: 'https://dialogue.example/v1',
      apiKey: 'secret-key-must-not-appear',
      model: 'custom-dialogue-model',
      enabled: true,
    });
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as typeof fetch;

    const stream = aiService.streamConfiguredDialogue([{ role: 'user', content: 'hello' }]);
    await expect(stream.next()).rejects.toEqual(
      expect.objectContaining({
        name: 'ConfiguredDialogueError',
        kind: 'transport',
        host: 'dialogue.example',
      } satisfies Partial<ConfiguredDialogueError>)
    );
  });

  it('uses the same-origin Vite proxy only when the development flag is enabled', () => {
    expect(resolveDialogueTransportEndpoint('https://dialogue.example/v1/chat/completions')).toBe(
      'https://dialogue.example/v1/chat/completions'
    );

    globalThis.NOVELLA_VITE_DIALOGUE_PROXY_ENABLED = true;
    expect(
      resolveDialogueTransportEndpoint('https://dialogue.example/v1/chat/completions?stream=true')
    ).toBe('/__novella_dialogue_proxy/v1/chat/completions?stream=true');
    expect(resolveDialogueTransportEndpoint('http://dialogue.example/v1/chat/completions')).toBe(
      'http://dialogue.example/v1/chat/completions'
    );
  });
});
