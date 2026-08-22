import { ReadableStream } from 'node:stream/web';

import { anthropicStrategy } from '@/core/ai/providers/anthropic-strategy';
import { yieldChunked } from '@/core/services/ai/text/ai-stream';

function sseBody(parts: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      parts.forEach((part) => controller.enqueue(encoder.encode(part)));
      controller.close();
    },
  });
}

describe('Anthropic SSE strategy', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('streams content_block_delta text and sends stream=true', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: sseBody([
        'event: content_block_delta\n',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"第一幕"}}\n\n',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"：开场"}}\n\n',
      ]),
    }) as typeof fetch;

    const chunks: string[] = [];
    for await (const chunk of anthropicStrategy.stream!('test-key', {
      model: 'claude-test',
      messages: [{ role: 'user', content: '生成脚本' }],
    })) {
      chunks.push(chunk);
    }

    expect(anthropicStrategy.supportsStreaming).toBe(true);
    expect(chunks).toEqual(['第一幕', '：开场']);
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toMatchObject({
      model: 'claude-test',
      stream: true,
    });
  });

  it('streams thinking_delta separately from visible text', async () => {
    global.fetch = jest.fn().mockImplementation(async () => ({
      ok: true,
      body: sseBody([
        'data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"先想分镜"}}\n\n',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"第一镜"}}\n\n',
      ]),
    })) as typeof fetch;

    const events: Array<{ kind: string; text: string }> = [];
    for await (const event of anthropicStrategy.streamEvents!('test-key', {
      model: 'claude-test',
      messages: [{ role: 'user', content: '生成分镜' }],
    })) {
      events.push(event);
    }
    const text: string[] = [];
    for await (const chunk of anthropicStrategy.stream!('test-key', {
      model: 'claude-test',
      messages: [{ role: 'user', content: '生成分镜' }],
    })) {
      text.push(chunk);
    }

    expect(events).toEqual([
      { kind: 'thinking', text: '先想分镜' },
      { kind: 'text', text: '第一镜' },
    ]);
    expect(text).toEqual(['第一镜']);
  });

  it('stops fallback chunks after the caller cancels', async () => {
    const controller = new AbortController();
    const stream = yieldChunked('流式草稿内容', 2, controller.signal);

    await expect(stream.next()).resolves.toMatchObject({ value: '流式', done: false });
    controller.abort();
    await expect(stream.next()).rejects.toMatchObject({ name: 'AbortError' });
  });
});
