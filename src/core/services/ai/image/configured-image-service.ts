import { loadServiceConnection } from '@/core/config/ai-connection-settings';
import { isTauri } from '@/core/utils/environment';
import { tauriService } from '@/infrastructure/tauri-bridge/commands';

import type {
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageSize,
} from './image-generation/types';
import { parseSize } from './image-generation/utils';

export function imageEndpoint(baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '');
  if (/\/images\/generations(?:\/|$)/i.test(base)) return base;
  if (/\/v\d+(?:beta)?$/i.test(base) || /\/api\/v\d+$/i.test(base)) {
    return `${base}/images/generations`;
  }
  return `${base}/v1/images/generations`;
}

export function mapCompatibleImageSize(size?: string): string {
  if (!size) return '1024x1024';
  if (/^\d+x\d+$/i.test(size)) return size;
  if (/^[14]K$/i.test(size) || /^2K$/i.test(size)) return '1024x1024';
  return '1024x1024';
}

export function mapGrokImageResolution(size?: string): '1k' | '2k' {
  return /^2K$/i.test(size ?? '') || /^4K$/i.test(size ?? '') ? '2k' : '1k';
}

export function buildConfiguredImageBody(
  model: string,
  prompt: string,
  options: ImageGenerationOptions = {}
): Record<string, unknown> {
  const n = options.numImages ?? 1;
  if (/grok-imagine/i.test(model)) {
    return {
      model,
      prompt,
      n,
      response_format: 'b64_json',
      resolution: mapGrokImageResolution(options.size ?? '2K'),
    };
  }
  return {
    model,
    prompt,
    size: mapCompatibleImageSize(options.size ?? '2K'),
    n,
    negative_prompt: options.negativePrompt,
    quality: options.quality,
    response_format: 'url',
  };
}

export function parseConfiguredImageResponseText(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const images: Array<Record<string, string>> = [];
    for (const line of text.split(/\r?\n/)) {
      const start = line.indexOf('{');
      if (start < 0) continue;
      try {
        const parsed: unknown = JSON.parse(line.slice(start));
        const event =
          parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
        if (event.type !== 'image' || typeof event.image_url !== 'string') continue;
        images.push({
          url: event.image_url,
          ...(typeof event.mime_type === 'string' ? { mime_type: event.mime_type } : {}),
        });
      } catch {
        // Ignore non-JSON status lines and continue looking for image events.
      }
    }
    if (images.length > 0) return { data: images };
    throw new Error('图片服务返回了无法解析的响应');
  }
}

export function detectBase64ImageMime(value: string): string | undefined {
  try {
    const sample = atob(value.trim().slice(0, 32));
    const bytes = Array.from(sample, (character) => character.charCodeAt(0));
    if (bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10') return 'image/png';
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if (sample.startsWith('GIF87a') || sample.startsWith('GIF89a')) return 'image/gif';
    if (sample.startsWith('RIFF') && sample.slice(8, 12) === 'WEBP') return 'image/webp';
  } catch {
    // The native image validator remains the final authority for malformed data.
  }
  return undefined;
}

export function parseConfiguredImagePayload(payload: unknown): {
  url: string;
  width?: number;
  height?: number;
} {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const root = record.data ?? payload;
  const image: unknown = Array.isArray(root)
    ? (root as unknown[])[0]
    : ((root as { images?: unknown[]; output?: unknown[] } | null)?.images?.[0] ??
      (root as { output?: unknown[] } | null)?.output?.[0] ??
      root);
  const item = image && typeof image === 'object' ? (image as Record<string, unknown>) : {};
  const url =
    (typeof item.url === 'string' && item.url) ||
    (typeof item.image_url === 'string' && item.image_url) ||
    (typeof item.output_url === 'string' && item.output_url) ||
    '';
  const b64 =
    (typeof item.b64_json === 'string' && item.b64_json) ||
    (typeof item.b64Json === 'string' && item.b64Json) ||
    '';
  const declaredMime =
    typeof item.mime_type === 'string' && item.mime_type.startsWith('image/')
      ? item.mime_type
      : undefined;
  if (url) {
    return {
      url,
      width: typeof item.width === 'number' ? item.width : undefined,
      height: typeof item.height === 'number' ? item.height : undefined,
    };
  }
  if (b64) {
    return {
      url: `data:${declaredMime ?? detectBase64ImageMime(b64) ?? 'image/png'};base64,${b64}`,
    };
  }
  throw new Error('图片生成服务未返回图片地址');
}

export async function generateWithConfiguredImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<ImageGenerationResult | null> {
  const connection = await loadServiceConnection('image');
  if (!connection.enabled || !connection.apiKey.trim()) return null;

  const endpoint = imageEndpoint(connection.baseUrl);
  const size = mapCompatibleImageSize(options.size ?? '2K');
  const body = buildConfiguredImageBody(connection.model, prompt, options);

  const payload = isTauri()
    ? await tauriService.generateConfiguredImage({
        endpoint,
        apiKey: connection.apiKey,
        model: connection.model,
        prompt,
        size,
        resolution: typeof body.resolution === 'string' ? body.resolution : undefined,
        n: typeof body.n === 'number' ? body.n : undefined,
      })
    : await fetchConfiguredImage(endpoint, connection.apiKey, body, options.signal);

  const image = parseConfiguredImagePayload(payload);
  const dimensions = parseSize(size as ImageSize);
  return {
    url: image.url,
    width: image.width ?? dimensions.width,
    height: image.height ?? dimensions.height,
    model: connection.model,
  };
}

async function fetchConfiguredImage(
  endpoint: string,
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw Object.assign(new Error(`图片生成请求失败 (HTTP ${response.status})`), {
      response: { status: response.status },
    });
  }
  return parseConfiguredImageResponseText(await response.text());
}
