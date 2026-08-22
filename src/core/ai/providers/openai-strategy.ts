/**
 * OpenAI Provider Strategy
 */

import type { DialogueStreamEvent } from '@/core/ai/dialogue-stream-events';
import { parseOpenAIStreamDelta, textChunksFromEvents } from '@/core/ai/dialogue-stream-events';
import {
  resolveDialogueTransportEndpoint,
  resolveOpenAICompatibleEndpoint,
} from '@/core/config/ai-connection-settings';
import type { AIRequestConfig } from '@/shared/types/ai-core';

import type { OpenAICompatibleConfig } from './openai-compatible-strategy';
import { OpenAICompatibleStrategy } from './openai-compatible-strategy';

const openAIConfig: OpenAICompatibleConfig = {
  name: 'openai',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  providerLabel: 'OpenAI',
};

export class OpenAIStrategy extends OpenAICompatibleStrategy {
  readonly name = openAIConfig.name;
  protected readonly apiConfig = openAIConfig;
  supportsStreaming = true;

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
        resolveOpenAICompatibleEndpoint(endpoint || openAIConfig.endpoint, openAIConfig.endpoint)
      ),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...requestBody, stream: true }),
        signal,
      }
    );

    if (!response.ok) {
      throw this.handleError(openAIConfig.providerLabel, response.status);
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
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;

            try {
              yield* parseOpenAIStreamDelta(JSON.parse(data));
            } catch {
              // Ignore incomplete or non-text SSE events.
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const openAIStrategy = new OpenAIStrategy();
