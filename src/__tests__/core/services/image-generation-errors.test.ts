import axios from 'axios';

import { describeImageGenerationFailure } from '@/core/services/ai/image/image-generation/errors';

describe('describeImageGenerationFailure', () => {
  it('explains a missing local image API key without calling it a character-save error', () => {
    const message = describeImageGenerationFailure(new Error('未配置图片生成服务'));

    expect(message).toContain('图片生成');
    expect(message).not.toMatch(/大纲未保存|请先导入小说/);
  });

  it('marks unauthorized third-party responses as image-service auth failures', () => {
    const error = new axios.AxiosError('Request failed with status code 401');
    error.response = { status: 401, data: { error: { message: 'invalid api key' } } } as never;

    const message = describeImageGenerationFailure(error);

    expect(message).toMatch(/认证失败|API Key/);
    expect(message).toContain('图片');
  });

  it('marks 5xx responses as third-party service errors', () => {
    const error = new axios.AxiosError('Request failed with status code 503');
    error.response = { status: 503, data: {} } as never;

    expect(describeImageGenerationFailure(error)).toMatch(/第三方|暂时不可用/);
  });

  it('explains Failed to fetch as a local network problem, not a raw English toast', () => {
    const message = describeImageGenerationFailure(new TypeError('Failed to fetch'));

    expect(message).toMatch(/连不上|网络|请求地址/);
    expect(message).toContain('图片');
    expect(message).not.toMatch(/Failed to fetch/i);
  });

  it('explains axios network errors without a response as unreachable image services', () => {
    const error = new axios.AxiosError('Network Error');

    expect(describeImageGenerationFailure(error)).toMatch(/连不上|网络|请求地址/);
    expect(describeImageGenerationFailure(error)).not.toMatch(/Network Error/i);
  });

  it('preserves native Tauri string errors', () => {
    expect(describeImageGenerationFailure('图片下载失败 (HTTP 403)')).toBe(
      '角色参考图生成失败：图片下载失败 (HTTP 403)'
    );
  });
});
