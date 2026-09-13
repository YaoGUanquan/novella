import { capabilityRegistry, createExecutionContext } from '@/core/services/ai/capability-registry';

describe('capability registry', () => {
  it('resolves a registered capability without model-name protocol inference', () => {
    const capability = capabilityRegistry.require('video', 'remote-gateway', 'video-v3');
    expect(capability.protocol).toBe('json');
    expect(capability.version).toBe('1');
  });

  it('creates a stable execution context', () => {
    const capability = capabilityRegistry.require('video', 'remote-gateway', 'video-v3');
    const context = createExecutionContext(capability, {
      requestId: 'req-1',
      timeoutMs: 1000,
      maxRetries: 2,
      idempotencyKey: 'idem-1',
    });
    expect(context).toMatchObject({
      requestId: 'req-1',
      providerId: 'remote-gateway',
      modelId: 'video-v3',
      idempotencyKey: 'idem-1',
    });
  });

  it('rejects unsupported capabilities explicitly', () => {
    expect(() => capabilityRegistry.require('video', 'remote-gateway', 'missing')).toThrow(
      'Unsupported capability'
    );
  });
});
