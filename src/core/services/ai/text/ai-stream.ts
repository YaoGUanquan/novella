import { providerRegistry } from '@/core/ai/providers';
import { resolveAIModelSettings } from '@/core/config/ai-connection-settings';
import { logger } from '@/core/utils/logger';

import { dispatchAIRequest, buildRequestConfig } from './ai-call-dispatcher';
import type { AIModel, AIModelSettings } from './ai-service-types';

const STREAM_CHUNK_SIZE = 10;

export function chunkText(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) chunks.push(text.slice(i, i + chunkSize));
  return chunks;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('AI generation cancelled', 'AbortError');
}

export async function* yieldChunked(
  content: string,
  chunkSize = STREAM_CHUNK_SIZE,
  signal?: AbortSignal
): AsyncGenerator<string> {
  for (const chunk of chunkText(content, chunkSize)) {
    throwIfAborted(signal);
    yield chunk;
  }
}

export async function* streamGenerateWithFallback(
  model: AIModel,
  settings: AIModelSettings,
  prompt: string,
  fallbackGenerate: () => Promise<string>,
  signal?: AbortSignal
): AsyncGenerator<string> {
  throwIfAborted(signal);
  const resolvedSettings = await resolveAIModelSettings(model.provider, model.id, settings);
  const strategyProvider = resolvedSettings.protocol ?? model.provider;
  const strategy = providerRegistry.get(strategyProvider) ?? providerRegistry.get(model.provider);

  if (!strategy?.supportsStreaming) {
    yield* yieldChunked(await fallbackGenerate(), STREAM_CHUNK_SIZE, signal);
    return;
  }

  if (strategy.stream) {
    if (!resolvedSettings.apiKey) throw new Error('未配置 API Key');
    const streamConfig = buildRequestConfig(model, resolvedSettings, prompt);
    streamConfig.stream = true;
    Object.defineProperty(streamConfig, 'signal', {
      value: signal,
      enumerable: false,
      configurable: true,
    });
    yield* strategy.stream(resolvedSettings.apiKey, streamConfig);
    return;
  }

  try {
    const config = buildRequestConfig(model, resolvedSettings, prompt);
    const response = await dispatchAIRequest(model, resolvedSettings, config);
    yield* yieldChunked(response.content, STREAM_CHUNK_SIZE, signal);
  } catch (error) {
    logger.error('流式生成失败:', error);
    throw error;
  }
}
