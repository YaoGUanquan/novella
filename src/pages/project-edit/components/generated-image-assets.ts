import type { ImageGenerationResult } from '@/core/services/ai/image/image-generation/types';
import { getErrorMessage } from '@/core/utils/data';
import { isTauri } from '@/core/utils/environment';
import { tauriService } from '@/infrastructure/tauri-bridge/commands';

export interface StoredGeneratedImage {
  previewUrl: string;
  reference: string;
  relativePath?: string;
  mimeType?: string;
  size?: number;
}

export function describeGeneratedImageAssetFailure(error: unknown): string {
  const message = getErrorMessage(error).trim();
  return message && message !== '[object Object]' ? message : '角色参考图生成失败';
}

export async function loadProjectImagePreview(
  reference: string,
  projectId?: string
): Promise<string> {
  if (/^(?:https?:|data:|blob:|asset:)/i.test(reference)) return reference;
  const workingDir =
    typeof window === 'undefined' ? '' : window.localStorage.getItem('novella_working_dir')?.trim();
  if (!workingDir || !projectId || !isTauri()) return '';
  const loaded = await tauriService.readImageAsset({
    workingDir,
    projectId,
    relativePath: reference,
  });
  return URL.createObjectURL(
    new Blob([Uint8Array.from(loaded.bytes)], {
      type: loaded.mime_type || 'application/octet-stream',
    })
  );
}

export function releaseProjectImagePreview(source: string): void {
  if (source.startsWith('blob:')) URL.revokeObjectURL(source);
}

function parseDataUrl(value: string): { bytes: number[]; mimeType: string } | null {
  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return null;
  const binary = atob(match[2]);
  return {
    mimeType: match[1].toLowerCase(),
    bytes: Array.from(binary, (character) => character.charCodeAt(0)),
  };
}

export async function storeGeneratedImage(
  result: ImageGenerationResult,
  options: { projectId?: string; filename: string }
): Promise<StoredGeneratedImage> {
  const source = result.url.trim();
  if (!source) throw new Error('图片生成服务未返回可用图片');
  const workingDir =
    typeof window === 'undefined' ? '' : window.localStorage.getItem('novella_working_dir')?.trim();
  if (!isTauri() || !workingDir || !options.projectId) {
    return { previewUrl: source, reference: source };
  }
  const data = parseDataUrl(source);
  const saved = await tauriService.downloadImageAsset({
    ...(data ? { bytes: data.bytes, mimeType: data.mimeType } : { sourceUrl: source }),
    workingDir,
    projectId: options.projectId,
    filename: options.filename,
  });
  return {
    previewUrl: '',
    reference: saved.relative_path,
    relativePath: saved.relative_path,
    mimeType: saved.mime_type,
    size: saved.size,
  };
}
