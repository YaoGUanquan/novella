import {
  buildConfiguredImageBody,
  detectBase64ImageMime,
  imageEndpoint,
  mapGrokImageResolution,
  mapCompatibleImageSize,
  parseConfiguredImagePayload,
  parseConfiguredImageResponseText,
} from '@/core/services/ai/image/configured-image-service';

describe('configured image helpers', () => {
  it('keeps an explicit generations path and adds /v1 for a host-only base', () => {
    expect(imageEndpoint('https://image.example/v1')).toBe(
      'https://image.example/v1/images/generations'
    );
    expect(imageEndpoint('https://image.example/v1/images/generations')).toBe(
      'https://image.example/v1/images/generations'
    );
    expect(imageEndpoint('https://sub2api.example')).toBe(
      'https://sub2api.example/v1/images/generations'
    );
  });

  it('maps Seedream-style 2K size to an OpenAI-compatible square', () => {
    expect(mapCompatibleImageSize('2K')).toBe('1024x1024');
    expect(mapCompatibleImageSize('1792x1024')).toBe('1792x1024');
  });

  it('accepts either a url or b64_json image payload', () => {
    expect(parseConfiguredImagePayload({ data: [{ url: 'https://cdn.example/a.png' }] }).url).toBe(
      'https://cdn.example/a.png'
    );
    expect(parseConfiguredImagePayload({ data: [{ b64_json: '/9j/4AAQ' }] }).url).toBe(
      'data:image/jpeg;base64,/9j/4AAQ'
    );
    expect(detectBase64ImageMime('iVBORw0KGgoAAAANSUhEUg==')).toBe('image/png');
  });

  it('requests Grok images as base64 without the unsupported size field', () => {
    expect(mapGrokImageResolution('2K')).toBe('2k');
    expect(buildConfiguredImageBody('grok-imagine-image', 'cat', { size: '2K' })).toEqual({
      model: 'grok-imagine-image',
      prompt: 'cat',
      n: 1,
      response_format: 'b64_json',
      resolution: '2k',
    });
  });

  it('extracts a base64 data URL from an SSE image event', () => {
    const payload = parseConfiguredImageResponseText(
      'event: message\ndata: {"type":"image","image_url":"data:image/jpeg;base64,/9j/","mime_type":"image/jpeg"}\n\n'
    );
    expect(parseConfiguredImagePayload(payload).url).toBe('data:image/jpeg;base64,/9j/');
  });
});
