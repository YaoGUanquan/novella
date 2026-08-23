import { tauriService } from '@/infrastructure/tauri-bridge/commands';
import {
  describeGeneratedImageAssetFailure,
  loadProjectImagePreview,
  storeGeneratedImage,
} from '@/pages/project-edit/components/generated-image-assets';

describe('generated image asset helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    jest.restoreAllMocks();
  });

  it('loads a project-relative reference through the validated native command', async () => {
    localStorage.setItem('novella_working_dir', 'D:\\NovellaWorkspace');
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    const read = jest.spyOn(tauriService, 'readImageAsset').mockResolvedValue({
      bytes: [0xff, 0xd8, 0xff],
      mime_type: 'image/jpeg',
      size: 3,
    });

    await expect(loadProjectImagePreview('assets/images/niu.jpg', 'project-1')).resolves.toBe(
      'blob:mock-url'
    );
    expect(read).toHaveBeenCalledWith({
      workingDir: 'D:\\NovellaWorkspace',
      projectId: 'project-1',
      relativePath: 'assets/images/niu.jpg',
    });
  });

  it('keeps remote URLs unchanged for old projects and browser fallback', async () => {
    await expect(loadProjectImagePreview('https://cdn.example/niu.png', 'project-1')).resolves.toBe(
      'https://cdn.example/niu.png'
    );
    await expect(
      storeGeneratedImage(
        { url: 'https://cdn.example/niu.png', width: 1024, height: 1024, model: 'image-1' },
        { projectId: 'project-1', filename: 'niu' }
      )
    ).resolves.toEqual({
      previewUrl: 'https://cdn.example/niu.png',
      reference: 'https://cdn.example/niu.png',
    });
  });

  it('keeps native download errors visible instead of replacing them with a generic failure', () => {
    expect(describeGeneratedImageAssetFailure('图片下载失败 (HTTP 302)')).toBe(
      '图片下载失败 (HTTP 302)'
    );
    expect(describeGeneratedImageAssetFailure({})).toBe('角色参考图生成失败');
  });
});
