import type {
  GenerationExecutionContext,
  GenerationOperation,
  GenerationTask,
} from './unified-generation-types';

export interface CapabilityRegistration {
  operation: GenerationOperation;
  providerId: string;
  modelId: string;
  version: string;
  protocol: string;
  endpointRef?: string;
  execute?: (...args: never[]) => Promise<unknown>;
  createContext?: (input: {
    requestId: string;
    timeoutMs: number;
    maxRetries: number;
    idempotencyKey?: string;
  }) => GenerationExecutionContext;
}

class CapabilityRegistry {
  private readonly registrations = new Map<string, CapabilityRegistration>();

  register(registration: CapabilityRegistration): void {
    this.registrations.set(
      `${registration.operation}:${registration.providerId}:${registration.modelId}`,
      registration
    );
  }

  get(operation: GenerationOperation, providerId: string, modelId: string) {
    return this.registrations.get(`${operation}:${providerId}:${modelId}`);
  }

  list(operation?: GenerationOperation): CapabilityRegistration[] {
    return [...this.registrations.values()].filter(
      (registration) => !operation || registration.operation === operation
    );
  }

  require(operation: GenerationOperation, providerId: string, modelId: string) {
    const registration = this.get(operation, providerId, modelId);
    if (!registration) {
      throw new Error(`Unsupported capability: ${operation}/${providerId}/${modelId}`);
    }
    return registration;
  }
}

export const capabilityRegistry = new CapabilityRegistry();

for (const modelId of [
  'grok-imagine-1.5-video',
  'video-v1',
  'MiniMax-H3-933-1440P-GF',
  'video-v2',
  'video-v2-fast',
  'video-v3',
]) {
  capabilityRegistry.register({
    operation: 'video',
    providerId: 'remote-gateway',
    modelId,
    version: '1',
    protocol: modelId.startsWith('grok-') ? 'multipart' : 'json',
  });
}

export function createExecutionContext(
  registration: CapabilityRegistration,
  input: Parameters<NonNullable<CapabilityRegistration['createContext']>>[0]
): GenerationExecutionContext {
  return (
    registration.createContext?.(input) ?? {
      requestId: input.requestId,
      operation: registration.operation,
      providerId: registration.providerId,
      modelId: registration.modelId,
      endpointRef: registration.endpointRef,
      protocol: registration.protocol,
      requestVersion: registration.version,
      idempotencyKey: input.idempotencyKey,
      timeoutMs: input.timeoutMs,
      maxRetries: input.maxRetries,
      createdAt: new Date().toISOString(),
    }
  );
}

export function assertTaskContext(task: GenerationTask, context: GenerationExecutionContext): void {
  if (task.context.requestId !== context.requestId || task.context.modelId !== context.modelId) {
    throw new Error('Generation task context mismatch');
  }
}
