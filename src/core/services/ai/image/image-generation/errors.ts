import axios from 'axios';

export const MISSING_IMAGE_SERVICE_MESSAGE =
  '未配置图片生成服务。请先在系统设置中填写图片生成的请求地址、API Key 和模型。';

export const IMAGE_NETWORK_FAILURE_MESSAGE =
  '连不上图片生成服务。请检查系统设置里的图片请求地址、本机网络，以及图片服务是否已启动。这不是角色保存失败。';

const NETWORK_FAILURE =
  /failed to fetch|network error|err_network|econnrefused|enotfound|etimedout|err_connection|load failed|networkerror|fetch failed/i;

function statusFromError(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const status = (error as { response?: { status?: unknown } }).response?.status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === 'string') return error.trim();
  return '';
}

export function describeImageGenerationFailure(error: unknown): string {
  const status = statusFromError(error);
  if (status === 401 || status === 403) {
    return '图片服务认证失败。请检查系统设置里的图片 API Key 是否有效，这通常是第三方服务拒绝了请求。';
  }
  if (status === 429) {
    return '图片服务请求过于频繁或额度不足，请稍后重试。';
  }
  if (status && status >= 500) {
    return `图片服务暂时不可用（HTTP ${status}），这是第三方服务错误。`;
  }
  if (status) {
    return `图片生成请求失败（HTTP ${status}）。请检查图片服务地址和模型配置。`;
  }

  const message = messageFromError(error);
  if (NETWORK_FAILURE.test(message) || (axios.isAxiosError(error) && !error.response)) {
    return IMAGE_NETWORK_FAILURE_MESSAGE;
  }

  if (message) {
    if (/未配置图片生成/.test(message)) return message;
    if (/图片生成/.test(message)) return message;
    return `角色参考图生成失败：${message}`;
  }

  return '角色参考图生成失败，请检查图片服务配置后重试。';
}
