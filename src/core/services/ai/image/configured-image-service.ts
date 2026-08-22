import { loadServiceConnection } from '@/core/config/ai-connection-settings';

import type { ImageGenerationOptions, ImageGenerationResult } from './image-generation/types';
import { parseSize } from './image-generation/utils';

function imageEndpoint(baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return /\/images\/generations(?:\/|$)/i.test(base) ? base : `${base}/images/generations`;
}

export async function generateWithConfiguredImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<ImageGenerationResult | null> {
  const connection = await loadServiceConnection('image');
  if (!connection.enabled || !connection.apiKey.trim()) return null;

  const size = options.size ?? '2K';
  const response = await fetch(imageEndpoint(connection.baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${connection.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: connection.model,
      prompt,
      size,
      n: options.numImages ?? 1,
      negative_prompt: options.negativePrompt,
      quality: options.quality,
      response_format: 'url',
    }),
    signal: options.signal,
  });
  if (!response.ok) throw new Error(`图片生成请求失败 (HTTP ${response.status})`);
  const payload = await response.json();
  const root = payload?.data ?? payload;
  const image = Array.isArray(root) ? root[0] : (root?.images?.[0] ?? root?.output?.[0] ?? root);
  const url = image?.url ?? image?.image_url ?? image?.output_url ?? '';
  if (!url) throw new Error('图片生成服务未返回图片地址');
  const dimensions = parseSize(size);
  return {
    url,
    width: image?.width ?? dimensions.width,
    height: image?.height ?? dimensions.height,
    model: connection.model,
  };
}
