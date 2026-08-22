import { saveRemoteVideoGatewaySettings } from '@/core/config/ai-connection-settings';
import {
  buildGrokFormData,
  buildVideoGenerationRequest,
  createRemoteVideoTask,
  getRemoteVideoTask,
  resolveVideoReferences,
} from '@/core/services/ai/video/remote-video-service';

describe('remote video gateway transport', () => {
  beforeEach(async () => {
    localStorage.clear();
    await saveRemoteVideoGatewaySettings({
      enabled: true,
      baseUrl: 'https://gateway.example',
      apiKey: 'secret',
      model: 'video-v3',
      timeoutMs: 10000,
      modelMap: { 'video-v3': 'mapped-v3' },
    });
  });

  it('uses the documented v1 video endpoint and maps the model', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'task/1', status: 'queued' }),
      });
    global.fetch = fetchMock as typeof fetch;
    const task = await createRemoteVideoTask({
      model: 'video-v3',
      prompt: 'a scene',
      duration: 10,
      aspectRatio: '16:9',
    });
    expect(task.taskId).toBe('task/1');
    expect(fetchMock.mock.calls[0][0]).toBe('https://gateway.example/v1/videos');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: 'Bearer secret' });
    expect(JSON.parse(String(init.body)).model).toBe('mapped-v3');
  });

  it('URL-encodes task IDs when polling', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'task/1',
          status: 'completed',
          url: 'https://cdn.example/video.mp4',
        }),
      });
    global.fetch = fetchMock as typeof fetch;
    const task = await getRemoteVideoTask({ model: 'video-v3' }, 'task/1');
    expect(task.resultUrl).toBe('https://cdn.example/video.mp4');
    expect(fetchMock.mock.calls[0][0]).toBe('https://gateway.example/v1/videos/task%2F1');
  });

  it('serializes video-v3 advanced parameters and deduplicated public references', () => {
    const payload = buildVideoGenerationRequest({
      model: 'video-v3',
      prompt: 'a scene',
      images: ['https://cdn.example/a.png', 'https://cdn.example/a.png'],
      videos: ['https://cdn.example/ref.mp4'],
      audios: ['https://cdn.example/ref.mp3'],
      duration: 10,
      aspectRatio: '16:9',
      resolution: '720p',
      generateAudio: true,
      seed: 42,
      bypassFaceCheck: true,
      gridStrength: 0.4,
      startFrameUrl: 'https://cdn.example/start.png',
      endFrameUrl: 'https://cdn.example/end.png',
    });

    expect(payload).toMatchObject({
      model: 'video-v3',
      ratio: '16:9',
      duration: 10,
      seed: 42,
      bypass_face_check: true,
      grid_strength: 0.4,
      start_frame_url: 'https://cdn.example/start.png',
      end_frame_url: 'https://cdn.example/end.png',
      images: ['https://cdn.example/a.png'],
    });
    expect(payload).not.toHaveProperty('resolution');
  });

  it('rejects local references before a JSON request is sent', () => {
    expect(() => resolveVideoReferences({ images: ['C:\\temp\\frame.png'] })).toThrow(
      '素材必须是公网可访问的 http(s) URL'
    );
  });

  it('uses the MiniMax video protocol without conflicting generic fields', () => {
    const payload = buildVideoGenerationRequest({
      model: 'MiniMax-H3-933-1440P-GF',
      prompt: 'a scene',
      duration: 6,
      resolution: '1280x720',
      images: ['https://cdn.example/reference.png'],
      videos: ['https://cdn.example/reference.mp4'],
      audios: ['https://cdn.example/reference.mp3'],
      aspectRatio: '16:9',
    });

    expect(payload).toEqual({
      model: 'MiniMax-H3-933-1440P-GF',
      prompt: 'a scene',
      seconds: 6,
      size: '1280x720',
      images: ['https://cdn.example/reference.png'],
      reference_videos: ['https://cdn.example/reference.mp4'],
      reference_audios: ['https://cdn.example/reference.mp3'],
    });
  });

  it('builds Grok multipart input_reference files from public image URLs', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['image-bytes'], { type: 'image/png' }),
    });
    global.fetch = fetchMock as typeof fetch;

    const form = await buildGrokFormData({
      model: 'grok-imagine-1.5-video',
      prompt: 'animate this',
      images: ['https://cdn.example/character.png'],
    });

    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example/character.png');
    expect(form.get('model')).toBe('grok-imagine-1.5-video');
    expect(form.get('input_reference')).toBeInstanceOf(Blob);
  });
});
