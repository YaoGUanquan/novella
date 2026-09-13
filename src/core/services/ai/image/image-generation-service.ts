/**
 * 图像生成服务 - 统一入口
 * 支持：字节 Seedream、快手可灵、生数 Vidu
 */

// Re-export types
export type {
  ImageModel,
  ImageSize,
  ImageGenerationOptions,
  ImageGenerationResult,
  VideoGenerationOptions,
  VideoGenerationResult,
} from './image-generation/types';

// Re-export providers
export { generateWithSeedream } from './image-generation/providers/seedream';
export { generateWithKling, generateVideoWithKling } from './image-generation/providers/kling';
export { generateWithVidu, generateVideoWithVidu } from './image-generation/providers/vidu';
export { generateVideoWithSeedance } from './image-generation/providers/seedance';
export { generateWithConfiguredImage } from './configured-image-service';

// Import from providers for unified API
import axios from 'axios';

import { loadRemoteVideoGatewaySettings } from '@/core/config/ai-connection-settings';
import { capabilityRegistry } from '@/core/services/ai/capability-registry';
import { logger } from '@/core/utils/logger';
import { retryRequest } from '@/shared/utils';

import { generateRemoteVideo } from '../video/remote-video-service';

import { generateWithConfiguredImage } from './configured-image-service';
import {
  describeImageGenerationFailure,
  MISSING_IMAGE_SERVICE_MESSAGE,
} from './image-generation/errors';
import { generateWithKling, generateVideoWithKling } from './image-generation/providers/kling';
import { generateVideoWithSeedance } from './image-generation/providers/seedance';
import { generateWithSeedream } from './image-generation/providers/seedream';
import { generateWithVidu, generateVideoWithVidu } from './image-generation/providers/vidu';
import type {
  ImageGenerationOptions,
  ImageGenerationResult,
  VideoGenerationOptions,
  VideoGenerationResult,
} from './image-generation/types';
import { getAPIKey } from './image-generation/utils';

/** 默认重试次数 */
const DEFAULT_MAX_RETRIES = 2;

/** 是否是网络错误（可重试） */
export function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    // 网络错误、超时、5xx 服务器错误可重试
    const status = error.response?.status;
    return (
      !status || // 网络错误
      status === 408 || // 请求超时
      status === 429 || // 请求过多
      status >= 500 // 服务器错误
    );
  }
  return false;
}

/**
 * 图像生成 - 统一入口（带重试机制）
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<ImageGenerationResult> {
  try {
    const configured = await generateWithConfiguredImage(prompt, options);
    if (configured) return configured;
    const model = options.model ?? 'seedream-5.0';
    const fallbackService =
      model === 'kling-1.6' ? 'kling' : model === 'vidu-2.0' ? 'vidu' : 'seedream';
    const fallbackKey = await getAPIKey(fallbackService);
    if (!fallbackKey.trim()) {
      throw new Error(MISSING_IMAGE_SERVICE_MESSAGE);
    }
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    const registeredModel = ['seedream-5.0', 'kling-1.6', 'vidu-2.0'].includes(model)
      ? model
      : 'seedream-5.0';
    const capability = capabilityRegistry.require(
      'image',
      providerForImageModel(registeredModel),
      registeredModel
    );
    const provider = capability.execute as typeof generateWithSeedream;

    if (maxRetries <= 0) {
      return await provider(prompt, options);
    }

    return await retryRequest(() => provider(prompt, options), {
      maxRetries,
      delay: 1000,
      backoff: 'exponential',
      retryCondition: isNetworkError,
      onRetry: (attempt, error) => {
        logger.warn(`[ImageGen] ${model} 生成失败，尝试第 ${attempt} 次: ${error}`);
      },
    });
  } catch (error) {
    throw new Error(describeImageGenerationFailure(error));
  }
}

/**
 * 视频生成 - 统一入口（带重试机制）
 */
export async function generateVideo(
  prompt: string,
  options: VideoGenerationOptions = {}
): Promise<VideoGenerationResult> {
  const remoteSettings = await loadRemoteVideoGatewaySettings();
  if (remoteSettings.enabled && remoteSettings.apiKey.trim()) {
    const remoteModels = new Set([
      'grok-imagine-1.5-video',
      'video-v1',
      'MiniMax-H3-933-1440P-GF',
      'video-v2',
      'video-v2-fast',
      'video-v3',
    ]);
    const requestedModel =
      options.model && remoteModels.has(options.model) ? options.model : remoteSettings.model;
    const images = [
      ...(options.referenceImage ? [options.referenceImage] : []),
      ...(options.referenceImages ?? []),
      ...(options.characterReferences ?? []).flatMap((character) => [
        character.referenceImageUrls?.front,
        character.referenceImageUrls?.fullBody,
        character.referenceImageUrls?.side,
      ]),
    ].filter((value): value is string => Boolean(value));
    const remote = await generateRemoteVideo(
      {
        model: requestedModel,
        prompt,
        duration: options.duration,
        aspectRatio: options.aspectRatio,
        resolution: options.resolution,
        generateAudio: options.generateAudio,
        negativePrompt: options.negativePrompt,
        seed: options.seed,
        bypassFaceCheck: options.bypassFaceCheck,
        gridStrength: options.gridStrength,
        startFrameUrl: options.startFrameUrl,
        endFrameUrl: options.endFrameUrl,
        images,
        videos: options.referenceVideos,
        audios: options.referenceAudios,
      },
      { signal: options.signal }
    );
    const status = remote.status.toLowerCase();
    return {
      url: remote.resultUrl ?? '',
      duration: options.duration ?? 5,
      width: 1920,
      height: 1080,
      model: remote.model,
      taskId: remote.taskId,
      status:
        ['completed', 'succeeded', 'success'].includes(status) || remote.resultUrl
          ? 'completed'
          : status === 'failed' || status === 'failure'
            ? 'failed'
            : 'processing',
    };
  }
  const model = options.model ?? 'seedance-2.0';
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  const capability = capabilityRegistry.require('video', providerForVideoModel(model), model);
  const provider = capability.execute as typeof generateVideoWithSeedance;

  if (maxRetries <= 0) {
    return provider(prompt, options);
  }

  return retryRequest(() => provider(prompt, options), {
    maxRetries,
    delay: 2000, // 视频生成需要更长的间隔
    backoff: 'exponential',
    retryCondition: isNetworkError,
    onRetry: (attempt, error) => {
      logger.warn(`[VideoGen] ${model} 生成失败，尝试第 ${attempt} 次: ${error}`);
    },
  });
}

/**
 * 查询视频生成状态
 */
export async function getVideoStatus(
  taskId: string,
  model: string = 'seedance-2.0'
): Promise<VideoGenerationResult> {
  let url = '';
  let apiKey = '';

  switch (model) {
    case 'seedance-2.0':
      url = `https://ark.cn-beijing.volces.com/api/v3/video/tasks/${taskId}`;
      apiKey = await getAPIKey('seedance');
      break;
    case 'kling-1.6':
      url = `https://api.klingai.com/v1/videos/tasks/${taskId}`;
      apiKey = await getAPIKey('kling');
      break;
    case 'vidu-2.0':
      url = `https://api.vidu.cn/v1/videos/tasks/${taskId}`;
      apiKey = await getAPIKey('vidu');
      break;
  }

  const response = await axios({
    method: 'get',
    url,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  const videoData = response.data?.data ?? response.data;

  return {
    url: videoData?.url ?? '',
    coverUrl: videoData?.cover_url ?? videoData?.cover_image_url,
    duration: videoData?.duration ?? 5,
    width: videoData?.width ?? 1920,
    height: videoData?.height ?? 1080,
    model,
    taskId,
    status:
      videoData?.status === 'completed'
        ? 'completed'
        : videoData?.status === 'failed'
          ? 'failed'
          : 'processing',
  };
}

export const imageGenerationService = {
  generateImage,
  generateVideo,
  getVideoStatus,
  // 单独服务
  seedream: generateWithSeedream,
  kling: {
    image: generateWithKling,
    video: generateVideoWithKling,
  },
  vidu: {
    image: generateWithVidu,
    video: generateVideoWithVidu,
  },
  seedance: generateVideoWithSeedance,
};

function providerForImageModel(model: string): string {
  if (model === 'kling-1.6') return 'kling';
  if (model === 'vidu-2.0') return 'vidu';
  return 'seedream';
}

function providerForVideoModel(model: string): string {
  if (model === 'kling-1.6') return 'kling';
  if (model === 'vidu-2.0') return 'vidu';
  return 'seedance';
}

capabilityRegistry.register({
  operation: 'image',
  providerId: 'seedream',
  modelId: 'seedream-5.0',
  version: '1',
  protocol: 'native',
  execute: generateWithSeedream as (...args: never[]) => Promise<unknown>,
});
capabilityRegistry.register({
  operation: 'image',
  providerId: 'kling',
  modelId: 'kling-1.6',
  version: '1',
  protocol: 'native',
  execute: generateWithKling as (...args: never[]) => Promise<unknown>,
});
capabilityRegistry.register({
  operation: 'image',
  providerId: 'vidu',
  modelId: 'vidu-2.0',
  version: '1',
  protocol: 'native',
  execute: generateWithVidu as (...args: never[]) => Promise<unknown>,
});
capabilityRegistry.register({
  operation: 'video',
  providerId: 'seedance',
  modelId: 'seedance-2.0',
  version: '1',
  protocol: 'native',
  execute: generateVideoWithSeedance as (...args: never[]) => Promise<unknown>,
});
capabilityRegistry.register({
  operation: 'video',
  providerId: 'kling',
  modelId: 'kling-1.6',
  version: '1',
  protocol: 'native',
  execute: generateVideoWithKling as (...args: never[]) => Promise<unknown>,
});
capabilityRegistry.register({
  operation: 'video',
  providerId: 'vidu',
  modelId: 'vidu-2.0',
  version: '1',
  protocol: 'native',
  execute: generateVideoWithVidu as (...args: never[]) => Promise<unknown>,
});

export default imageGenerationService;
