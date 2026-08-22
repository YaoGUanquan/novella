/**
 * Google Gemini Provider Strategy
 */

import { resolveGoogleEndpoint } from '@/core/config/ai-connection-settings';
import type { AIRequestConfig, AIResponse } from '@/shared/types/ai-core';

import { BaseAIProviderStrategy } from './base';

export class GoogleStrategy extends BaseAIProviderStrategy {
  readonly name = 'google';

  async call(apiKey: string, config: AIRequestConfig): Promise<AIResponse> {
    const { endpoint, ...requestBody } = config;
    const response = await fetch(
      `${resolveGoogleEndpoint(endpoint || '', config.model)}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: requestBody.messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            temperature: requestBody.temperature,
            maxOutputTokens: requestBody.max_tokens,
          },
        }),
      }
    );

    if (!response.ok) {
      throw this.handleError('Google', response.status);
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      model: config.model,
    };
  }
}

export const googleStrategy = new GoogleStrategy();
