export type GenerationOperation = 'dialogue' | 'image' | 'video' | 'audio' | 'embed';

export type GenerationTaskStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type ProviderErrorCategory =
  | 'authentication'
  | 'rate_limited'
  | 'invalid_request'
  | 'unavailable'
  | 'timeout'
  | 'cancelled'
  | 'asset_validation'
  | 'unsupported'
  | 'unknown';

export interface GenerationExecutionContext {
  requestId: string;
  operation: GenerationOperation;
  providerId: string;
  modelId: string;
  endpointRef?: string;
  protocol?: string;
  requestVersion: string;
  idempotencyKey?: string;
  timeoutMs: number;
  maxRetries: number;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface ProviderError {
  category: ProviderErrorCategory;
  message: string;
  providerId?: string;
  operation?: GenerationOperation;
  retryable: boolean;
  statusCode?: number;
  requestId?: string;
  cause?: unknown;
}

export interface GenerationTask {
  taskId: string;
  status: GenerationTaskStatus;
  progress: number;
  modelId: string;
  context: GenerationExecutionContext;
  resultRef?: string;
  error?: ProviderError;
}
