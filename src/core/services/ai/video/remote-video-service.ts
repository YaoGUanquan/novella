import { loadRemoteVideoGatewaySettings } from '@/core/config/ai-connection-settings';

import type { RemoteVideoRequest, RemoteVideoTask } from './remote-video-types';

const isGrok = (model: string) => model.toLowerCase().startsWith('grok-');
const isMiniMax = (model: string) => model.toLowerCase().startsWith('minimax-');
const isGenerationEndpoint = (model: string) => model === 'video-v1';

function gatewayUrl(baseUrl: string, model: string, taskId?: string): string {
  const base = baseUrl.replace(/\/$/, '').replace(/\/v1$/i, '');
  const path = isGenerationEndpoint(model) ? '/v1/video/generations' : '/v1/videos';
  return `${base}${path}${taskId ? `/${encodeURIComponent(taskId)}` : ''}`;
}

function isPublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveVideoReferences(
  request: Pick<RemoteVideoRequest, 'images' | 'videos' | 'audios'>
): {
  images: string[];
  videos: string[];
  audios: string[];
} {
  const normalize = (values: string[] | undefined) => {
    const unique = [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
    if (unique.some((value) => !isPublicUrl(value))) {
      throw new Error('素材必须是公网可访问的 http(s) URL');
    }
    return unique;
  };
  return {
    images: normalize(request.images),
    videos: normalize(request.videos),
    audios: normalize(request.audios),
  };
}

export function buildVideoGenerationRequest(request: RemoteVideoRequest): Record<string, unknown> {
  const refs = resolveVideoReferences(request);
  const payload: Record<string, unknown> = { model: request.model, prompt: request.prompt };
  if (isGenerationEndpoint(request.model)) {
    if (request.duration !== undefined) payload.duration = request.duration;
    if (request.aspectRatio) payload.aspect_ratio = request.aspectRatio;
    if (refs.images.length) payload.images = refs.images;
    return payload;
  }
  if (isMiniMax(request.model)) {
    if (request.duration !== undefined) payload.seconds = request.duration;
    if (request.size || request.resolution) payload.size = request.size ?? request.resolution;
    if (refs.images.length) payload.images = refs.images;
    if (refs.videos.length) payload.reference_videos = refs.videos;
    if (refs.audios.length) payload.reference_audios = refs.audios;
    if (request.generateAudio !== undefined) payload.audio = request.generateAudio;
    return payload;
  }
  if (refs.images.length) payload.images = refs.images;
  if (refs.videos.length) payload.videos = refs.videos;
  if (refs.audios.length) payload.audios = refs.audios;
  if (request.duration !== undefined) payload.duration = request.duration;
  if (request.aspectRatio)
    payload[request.model === 'video-v3' ? 'ratio' : 'aspect_ratio'] = request.aspectRatio;
  if (request.resolution && request.model !== 'video-v3') payload.resolution = request.resolution;
  if (request.generateAudio !== undefined) payload.generate_audio = request.generateAudio;
  if (request.negativePrompt) payload.negative_prompt = request.negativePrompt;
  if (request.seed !== undefined) payload.seed = request.seed;
  if (request.bypassFaceCheck !== undefined) payload.bypass_face_check = request.bypassFaceCheck;
  if (request.gridStrength !== undefined) payload.grid_strength = request.gridStrength;
  if (request.size) payload.size = request.size;
  if (request.startFrameUrl) {
    if (!isPublicUrl(request.startFrameUrl))
      throw new Error('起始帧必须是公网可访问的 http(s) URL');
    payload.start_frame_url = request.startFrameUrl;
  }
  if (request.endFrameUrl) {
    if (!isPublicUrl(request.endFrameUrl)) throw new Error('结束帧必须是公网可访问的 http(s) URL');
    payload.end_frame_url = request.endFrameUrl;
  }
  return payload;
}

export async function buildGrokFormData(request: RemoteVideoRequest): Promise<FormData> {
  const refs = resolveVideoReferences(request);
  if (!refs.images.length) throw new Error('Grok 视频生成至少需要一张公网参考图片');
  const form = new FormData();
  form.append('model', request.model);
  form.append('prompt', request.prompt);
  form.append('aspect_ratio', request.aspectRatio || '16:9');
  form.append('seconds', String(request.duration ?? 5));
  form.append('resolution', request.resolution || '720p');
  for (const imageUrl of refs.images) {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`无法读取参考图片 (HTTP ${response.status})`);
    const blob = await response.blob();
    form.append('input_reference', blob, imageUrl.split('/').pop() || 'reference-image');
  }
  return form;
}

function parseTask(payload: unknown, model: string): RemoteVideoTask {
  const root =
    typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
  const data =
    typeof root.data === 'object' && root.data !== null
      ? (root.data as Record<string, unknown>)
      : root;
  const taskId = String(data.task_id ?? data.id ?? '').trim();
  if (!taskId) throw new Error('远程视频服务未返回任务 ID');
  return {
    taskId,
    status: String(data.status ?? 'queued'),
    progress: Math.max(0, Math.min(100, Number(data.progress ?? 0) || 0)),
    resultUrl:
      typeof data.result_url === 'string'
        ? data.result_url
        : typeof data.video_url === 'string'
          ? data.video_url
          : typeof data.url === 'string'
            ? data.url
            : undefined,
    error: typeof data.error === 'string' ? data.error : undefined,
    model,
  };
}

async function requestGateway(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  apiKey: string
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`远程视频请求失败 (HTTP ${response.status})`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function createRemoteVideoTask(request: RemoteVideoRequest): Promise<RemoteVideoTask> {
  const settings = await loadRemoteVideoGatewaySettings();
  if (!settings.enabled) throw new Error('远程视频网关未启用');
  if (!settings.apiKey.trim()) throw new Error('远程视频网关 API Key 未配置');
  const model = settings.modelMap[request.model] || settings.model || request.model;
  const url = gatewayUrl(settings.baseUrl, model);
  if (isGrok(model)) {
    const form = await buildGrokFormData({ ...request, model });
    return parseTask(
      await requestGateway(
        url,
        { method: 'POST', body: form },
        settings.timeoutMs,
        settings.apiKey
      ),
      request.model
    );
  }
  const body = buildVideoGenerationRequest({ ...request, model });
  return parseTask(
    await requestGateway(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      settings.timeoutMs,
      settings.apiKey
    ),
    request.model
  );
}

export async function getRemoteVideoTask(
  request: Pick<RemoteVideoRequest, 'model'>,
  taskId: string
): Promise<RemoteVideoTask> {
  const settings = await loadRemoteVideoGatewaySettings();
  if (!settings.enabled) throw new Error('远程视频网关未启用');
  if (!settings.apiKey.trim()) throw new Error('远程视频网关 API Key 未配置');
  const model = settings.modelMap[request.model] || settings.model || request.model;
  return parseTask(
    await requestGateway(
      gatewayUrl(settings.baseUrl, model, taskId),
      { method: 'GET' },
      settings.timeoutMs,
      settings.apiKey
    ),
    request.model
  );
}

export async function generateRemoteVideo(
  request: RemoteVideoRequest,
  options: { signal?: AbortSignal; maxPollAttempts?: number; pollIntervalMs?: number } = {}
): Promise<RemoteVideoTask> {
  const created = await createRemoteVideoTask(request);
  if (
    created.resultUrl ||
    ['completed', 'succeeded', 'success'].includes(created.status.toLowerCase())
  )
    return created;
  const maxAttempts = options.maxPollAttempts ?? 30;
  const intervalMs = options.pollIntervalMs ?? 2000;
  let current = created;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (options.signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    current = await getRemoteVideoTask(request, created.taskId);
    const status = current.status.toLowerCase();
    if (
      current.resultUrl ||
      ['completed', 'succeeded', 'success', 'failed', 'failure'].includes(status)
    )
      return current;
  }
  return current;
}

export const remoteVideoService = {
  create: createRemoteVideoTask,
  getStatus: getRemoteVideoTask,
  generate: generateRemoteVideo,
};
