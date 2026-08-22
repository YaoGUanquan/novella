/**
 * Baidu Wenxin Provider Strategy
 */

import type { AIRequestConfig, AIResponse } from '@/shared/types/ai-core';

import { BaseAIProviderStrategy } from './base';

interface BaiduRequestConfig extends AIRequestConfig {
  apiSecret?: string;
}

class BaiduStrategy extends BaseAIProviderStrategy {
  readonly name = 'baidu';

  async call(apiKey: string, config: AIRequestConfig, _requestId?: string): Promise<AIResponse> {
    const baiduConfig = config as BaiduRequestConfig;
    const apiSecret = baiduConfig.apiSecret;

    // 获取 access token
    const tokenResponse = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${apiSecret}`,
      { method: 'POST' }
    );

    if (!tokenResponse.ok) {
      throw new Error(`百度认证失败 (HTTP ${tokenResponse.status})`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error(`百度认证失败: 未获取到 access_token`);
    }

    const configuredEndpoint =
      typeof config.endpoint === 'string' ? config.endpoint.replace(/\/$/, '') : '';
    const chatEndpoint = configuredEndpoint
      ? configuredEndpoint.includes('{model}')
        ? configuredEndpoint.replace('{model}', encodeURIComponent(config.model))
        : `${configuredEndpoint}/${encodeURIComponent(config.model)}`
      : `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${config.model}`;
    const response = await fetch(
      `${chatEndpoint}?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: config.messages,
          temperature: config.temperature,
          max_output_tokens: config.max_tokens,
        }),
      }
    );

    if (!response.ok) {
      throw this.handleError('Baidu', response.status);
    }

    const data = await response.json();
    return {
      content: data.result,
      model: config.model,
    };
  }
}

export const baiduStrategy = new BaiduStrategy();
