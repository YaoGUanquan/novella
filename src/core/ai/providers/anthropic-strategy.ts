/**
 * Anthropic Provider Strategy
 */

import type { DialogueStreamEvent } from '@/core/ai/dialogue-stream-events';
import { parseAnthropicStreamEvent, textChunksFromEvents } from '@/core/ai/dialogue-stream-events';
import {
  resolveAnthropicEndpoint,
  resolveDialogueTransportEndpoint,
} from '@/core/config/ai-connection-settings';
import type { AIMessageContent, AIRequestConfig, AIResponse } from '@/shared/types/ai-core';

import { BaseAIProviderStrategy } from './base';

function textFromContent(content: AIMessageContent): string {
  return typeof content === 'string'
    ? content
    : content
        .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
        .map((part) => part.text)
        .join('\n');
}

function toAnthropicContent(content: AIMessageContent): string | Array<Record<string, unknown>> {
  if (typeof content === 'string') return content;

  const blocks: Array<Record<string, unknown>> = [];
  for (const part of content) {
    if (part.type === 'text') {
      blocks.push({ type: 'text', text: part.text });
      continue;
    }
    const match = part.image_url.url.match(
      /^data:(image\/(?:png|jpeg|gif|webp));base64,([\s\S]+)$/i
    );
    if (!match) {
      blocks.push({ type: 'text', text: '[图片附件未使用：Anthropic 仅支持本地图片数据。]' });
      continue;
    }
    blocks.push({
      type: 'image',
      source: { type: 'base64', media_type: match[1].toLowerCase(), data: match[2] },
    });
  }
  return blocks;
}

function buildAnthropicBody(config: AIRequestConfig, stream: boolean): Record<string, unknown> {
  const system = config.messages
    .filter((message) => message.role === 'system')
    .map((message) => textFromContent(message.content))
    .filter(Boolean)
    .join('\n\n');
  const messages = config.messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({ role: message.role, content: toAnthropicContent(message.content) }));

  return {
    model: config.model,
    messages,
    max_tokens: config.max_tokens,
    temperature: config.temperature,
    stream,
    ...(system ? { system } : {}),
  };
}

class AnthropicStrategy extends BaseAIProviderStrategy {
  readonly name = 'anthropic';
  supportsStreaming = true;

  async call(apiKey: string, config: AIRequestConfig): Promise<AIResponse> {
    const { endpoint, ...requestBody } = config;
    const response = await fetch(
      resolveDialogueTransportEndpoint(
        resolveAnthropicEndpoint(endpoint || 'https://api.anthropic.com/v1/messages')
      ),
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(buildAnthropicBody(requestBody, false)),
      }
    );

    if (!response.ok) {
      throw this.handleError('Anthropic', response.status);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      usage: data.usage,
      model: data.model,
    };
  }

  async *stream(apiKey: string, config: AIRequestConfig): AsyncGenerator<string> {
    yield* textChunksFromEvents(this.streamEvents(apiKey, config));
  }

  async *streamEvents(
    apiKey: string,
    config: AIRequestConfig
  ): AsyncGenerator<DialogueStreamEvent> {
    const { endpoint, signal, ...requestBody } = config;
    const response = await fetch(
      resolveDialogueTransportEndpoint(
        resolveAnthropicEndpoint(endpoint || 'https://api.anthropic.com/v1/messages')
      ),
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(buildAnthropicBody(requestBody, true)),
        signal,
      }
    );

    if (!response.ok) {
      throw this.handleError('Anthropic', response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            yield* parseAnthropicStreamEvent(JSON.parse(trimmed.slice(6)));
          } catch {
            // Ignore incomplete or non-text SSE events.
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const anthropicStrategy = new AnthropicStrategy();
