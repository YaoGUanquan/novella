import {
  saveRemoteVideoGatewaySettings,
  saveServiceConnection,
} from '@/core/config/ai-connection-settings';
import { generateImage, generateVideo } from '@/core/services/ai/image/image-generation-service';

describe('configured image and video facade routing', () => {
  beforeEach(() => localStorage.clear());

  it('routes image generation through the configured image service', async () => {
    await saveServiceConnection({
      kind: 'image',
      baseUrl: 'https://image.example/v1',
      apiKey: 'image-key',
      model: 'image-custom',
      enabled: true,
    });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [{ url: 'https://cdn.example/image.png' }] }),
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await generateImage('a storyboard frame', { maxRetries: 0 });
    expect(result.url).toBe('https://cdn.example/image.png');
    expect(fetchMock.mock.calls[0][0]).toBe('https://image.example/v1/images/generations');
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toMatchObject({
      model: 'image-custom',
      size: '1024x1024',
    });
  });

  it('routes video generation through the enabled remote gateway', async () => {
    await saveRemoteVideoGatewaySettings({
      enabled: true,
      baseUrl: 'https://video.example',
      apiKey: 'video-key',
      model: 'video-v3',
      timeoutMs: 10000,
      modelMap: {},
    });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'remote-task',
        status: 'completed',
        url: 'https://cdn.example/video.mp4',
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await generateVideo('a camera move', { maxRetries: 0 });
    expect(result.url).toBe('https://cdn.example/video.mp4');
    expect(result.status).toBe('completed');
    expect(fetchMock.mock.calls[0][0]).toBe('https://video.example/v1/videos');
  });
});
