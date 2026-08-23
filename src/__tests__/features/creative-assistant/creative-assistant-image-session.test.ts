import {
  loadCreativeAssistantSession,
  saveCreativeAssistantSession,
} from '@/features/creative-assistant/creative-assistant-session';

describe('creative assistant generated image session', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips generated image metadata without storing uploaded attachments', () => {
    saveCreativeAssistantSession('project-image', [
      {
        id: 'assistant-image',
        role: 'assistant',
        content: '已生成参考图。',
        generatedImages: [
          {
            id: 'image-1',
            prompt: '牛来角色参考图',
            previewUrl: 'asset://localhost/project/assets/images/niu.png',
            relativePath: 'assets/images/niu.png',
            mimeType: 'image/png',
            size: 123,
            createdAt: '2026-08-23T00:00:00.000Z',
          },
        ],
      },
    ]);

    expect(loadCreativeAssistantSession('project-image')[0].generatedImages?.[0]).toMatchObject({
      prompt: '牛来角色参考图',
      relativePath: 'assets/images/niu.png',
      previewUrl: '',
    });
  });
});
