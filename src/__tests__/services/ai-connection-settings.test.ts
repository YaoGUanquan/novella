import {
  loadProviderConnection,
  resolveAnthropicEndpoint,
  resolveGoogleEndpoint,
  resolveOpenAICompatibleEndpoint,
  saveProviderConnection,
  loadServiceConnection,
  saveServiceConnection,
} from '@/core/config/ai-connection-settings';

describe('AI connection settings', () => {
  beforeEach(() => localStorage.clear());

  it('reads legacy keys and writes the normalized secure entry', async () => {
    localStorage.setItem('api_openai_key', 'legacy-key');
    const loaded = await loadProviderConnection('openai', 'gpt-test');
    expect(loaded.apiKey).toBe('legacy-key');
    expect(loaded.baseUrl).toBe('https://api.openai.com/v1');

    await saveProviderConnection({ ...loaded, apiKey: 'new-key', model: 'custom-model' });
    const saved = JSON.parse(localStorage.getItem('secure_ai_connection_openai') || '{}');
    expect(saved.apiKey).toBe('new-key');
    expect(saved.model).toBe('custom-model');
  });

  it('normalizes provider base URLs without changing explicit endpoints', () => {
    expect(
      resolveOpenAICompatibleEndpoint(
        'https://gateway.example/v1',
        'https://api.openai.com/v1/chat/completions'
      )
    ).toBe('https://gateway.example/v1/chat/completions');
    expect(
      resolveOpenAICompatibleEndpoint('https://gateway.example/v1/chat/completions', 'fallback')
    ).toBe('https://gateway.example/v1/chat/completions');
    expect(resolveAnthropicEndpoint('https://gateway.example/v1')).toBe(
      'https://gateway.example/v1/messages'
    );
    expect(resolveGoogleEndpoint('https://gateway.example/v1beta', 'gemini-test')).toBe(
      'https://gateway.example/v1beta/models/gemini-test:generateContent'
    );
  });

  it('infers the Anthropic strategy from a Claude model without a protocol field in the UI', async () => {
    await saveServiceConnection({
      kind: 'dialogue',
      baseUrl: 'https://gateway.example/v1',
      apiKey: 'dialogue-key',
      model: 'claude-sonnet-custom',
      enabled: true,
    });
    const loaded = await loadServiceConnection('dialogue');
    expect(loaded.protocol).toBe('anthropic');
  });
});
