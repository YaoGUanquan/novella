import { secureStorage } from '@/core/services/project/secure-storage-service';
import type { AIModelSettings, ModelProvider } from '@/shared/types';

export interface ProviderConnectionSettings {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  apiSecret?: string;
  enabled: boolean;
}

export type ServiceConnectionKind = 'dialogue' | 'image' | 'video';
export type DialogueProtocol = 'openai' | 'anthropic';

export interface ServiceConnectionSettings {
  kind: ServiceConnectionKind;
  baseUrl: string;
  apiKey: string;
  model: string;
  protocol?: DialogueProtocol;
  enabled: boolean;
}

export interface RemoteVideoGatewaySettings {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  modelMap: Record<string, string>;
}

export const DEFAULT_REMOTE_VIDEO_GATEWAY: RemoteVideoGatewaySettings = {
  enabled: false,
  baseUrl: 'https://api.kkone.vip',
  apiKey: '',
  model: 'video-v3',
  timeoutMs: 60000,
  modelMap: {},
};

export const DEFAULT_SERVICE_CONNECTIONS: Record<ServiceConnectionKind, ServiceConnectionSettings> =
  {
    dialogue: {
      kind: 'dialogue',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-5.6-sol',
      protocol: 'openai',
      enabled: true,
    },
    image: {
      kind: 'image',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'image-1',
      enabled: true,
    },
    video: {
      kind: 'video',
      baseUrl: DEFAULT_REMOTE_VIDEO_GATEWAY.baseUrl,
      apiKey: '',
      model: DEFAULT_REMOTE_VIDEO_GATEWAY.model,
      enabled: false,
    },
  };

const DEFAULT_PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  deepseek: 'https://api.deepseek.com/v1',
  baidu: 'https://aip.baidubce.com',
  alibaba: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
};

const DEFAULT_SERVICE_BASE_URLS: Record<string, string> = {
  seedream: 'https://ark.cn-beijing.volces.com/api/v3',
  seedance: 'https://ark.cn-beijing.volces.com/api/v3',
  kling: 'https://api.klingai.com/v1',
  vidu: 'https://api.vidu.cn/v1',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readLocal(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseStoredObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function firstString(...values: unknown[]): string {
  return (
    values
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
      ?.trim() ?? ''
  );
}

function normalizeBaseUrl(value: string, fallback: string): string {
  const candidate = value.trim();
  if (!candidate) return fallback;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback;
    return candidate.replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

export function getDefaultProviderBaseUrl(provider: string): string {
  return DEFAULT_PROVIDER_BASE_URLS[provider] ?? '';
}

export function getDefaultServiceBaseUrl(service: string): string {
  return DEFAULT_SERVICE_BASE_URLS[service] ?? '';
}

export function normalizeProviderBaseUrl(value: string, provider: string): string {
  return normalizeBaseUrl(value, getDefaultProviderBaseUrl(provider));
}

export function normalizeRemoteVideoGatewaySettings(value: unknown): RemoteVideoGatewaySettings {
  const source = isRecord(value) ? value : {};
  const rawMap = isRecord(source.modelMap) ? source.modelMap : {};
  const modelMap = Object.fromEntries(
    Object.entries(rawMap).filter(
      ([key, model]) =>
        key.trim().length > 0 && typeof model === 'string' && model.trim().length > 0
    )
  ) as Record<string, string>;

  const timeout = Number(source.timeoutMs);
  return {
    enabled: source.enabled === true,
    baseUrl: normalizeBaseUrl(
      typeof source.baseUrl === 'string' ? source.baseUrl : '',
      DEFAULT_REMOTE_VIDEO_GATEWAY.baseUrl
    ),
    apiKey: typeof source.apiKey === 'string' ? source.apiKey : '',
    model: firstString(source.model, DEFAULT_REMOTE_VIDEO_GATEWAY.model),
    timeoutMs: Number.isFinite(timeout) ? Math.min(Math.max(timeout, 10000), 300000) : 60000,
    modelMap,
  };
}

export function normalizeServiceConnection(
  kind: ServiceConnectionKind,
  value: unknown
): ServiceConnectionSettings {
  const source = isRecord(value) ? value : {};
  const defaults = DEFAULT_SERVICE_CONNECTIONS[kind];
  const model = firstString(source.model, defaults.model);
  const protocol: DialogueProtocol = /anthropic|claude/i.test(
    `${model} ${String(source.baseUrl ?? '')}`
  )
    ? 'anthropic'
    : 'openai';
  return {
    kind,
    baseUrl: normalizeBaseUrl(
      typeof source.baseUrl === 'string' ? source.baseUrl : '',
      defaults.baseUrl
    ),
    apiKey: typeof source.apiKey === 'string' ? source.apiKey : '',
    model,
    ...(kind === 'dialogue' ? { protocol } : {}),
    enabled: source.enabled !== false,
  };
}

export async function loadServiceConnection(
  kind: ServiceConnectionKind
): Promise<ServiceConnectionSettings> {
  const secure = parseStoredObject(await secureStorage.getSecureConfig(`ai_service_${kind}`));
  const legacy = parseStoredObject(readLocal(`novella_ai_service_${kind}`));
  const merged = { ...(legacy ?? {}), ...(secure ?? {}) };
  const normalized = normalizeServiceConnection(kind, merged);
  if (normalized.apiKey) return normalized;

  // Compatibility: service-level settings may not exist in older projects.
  if (kind === 'dialogue') {
    const legacyProvider = await loadProviderConnection('openai', normalized.model);
    return normalizeServiceConnection(kind, {
      ...normalized,
      baseUrl: legacyProvider.baseUrl,
      apiKey: legacyProvider.apiKey,
      model: legacyProvider.model,
    });
  }
  return normalized;
}

export async function saveServiceConnection(value: ServiceConnectionSettings): Promise<void> {
  const normalized = normalizeServiceConnection(value.kind, value);
  await secureStorage.saveSecureConfig(`ai_service_${value.kind}`, JSON.stringify(normalized));
}

export function buildProviderConnection(
  provider: string,
  model: string,
  value?: Partial<ProviderConnectionSettings>
): ProviderConnectionSettings {
  return {
    provider,
    baseUrl: normalizeProviderBaseUrl(value?.baseUrl ?? '', provider),
    model: firstString(value?.model, model),
    apiKey: typeof value?.apiKey === 'string' ? value.apiKey : '',
    apiSecret: typeof value?.apiSecret === 'string' ? value.apiSecret : undefined,
    enabled: value?.enabled !== false,
  };
}

/**
 * Read a provider connection. The new secure entry wins, then the old secure
 * model-settings entry, then the legacy unprefixed localStorage keys.
 */
export async function loadProviderConnection(
  provider: string,
  defaultModel: string
): Promise<ProviderConnectionSettings> {
  const newStored = parseStoredObject(
    await secureStorage.getSecureConfig(`ai_connection_${provider}`)
  );
  const oldStored = parseStoredObject(
    await secureStorage.getSecureConfig(`ai_model_settings_${provider}`)
  );
  const legacyStored = parseStoredObject(readLocal(`ai_model_settings_${provider}`));
  const merged = { ...(legacyStored ?? {}), ...(oldStored ?? {}), ...(newStored ?? {}) };

  const apiKey = firstString(
    merged.apiKey,
    await secureStorage.getSecureConfig(`api_${provider}_key`),
    readLocal(`api_${provider}_key`),
    readLocal(`novella_api_key_${provider}`),
    readLocal(`${provider}_api_key`)
  );

  const apiSecret = firstString(
    merged.apiSecret,
    await secureStorage.getSecureConfig(`api_${provider}_secret`),
    readLocal(`api_${provider}_secret`)
  );

  return buildProviderConnection(provider, defaultModel, {
    baseUrl: firstString(merged.baseUrl, merged.apiUrl, merged.baseURL),
    model: firstString(merged.model, merged.modelId, defaultModel),
    apiKey,
    apiSecret: apiSecret || undefined,
    enabled: merged.enabled !== false,
  });
}

export async function saveProviderConnection(value: ProviderConnectionSettings): Promise<void> {
  const normalized = buildProviderConnection(value.provider, value.model, value);
  await secureStorage.saveSecureConfig(
    `ai_connection_${value.provider}`,
    JSON.stringify(normalized)
  );
}

export async function resolveAIModelSettings(
  provider: string,
  model: string,
  overrides: Partial<AIModelSettings> = {}
): Promise<AIModelSettings> {
  const stored = await loadProviderConnection(provider, model);
  const dialogue = await loadServiceConnection('dialogue');
  return {
    enabled: overrides.enabled ?? stored.enabled,
    apiKey: firstString(overrides.apiKey, dialogue.apiKey, stored.apiKey),
    apiSecret: firstString(overrides.apiSecret, stored.apiSecret) || undefined,
    protocol: dialogue.apiKey ? dialogue.protocol : undefined,
    apiUrl: normalizeProviderBaseUrl(
      firstString(
        overrides.apiUrl,
        overrides.baseURL,
        dialogue.apiKey ? dialogue.baseUrl : stored.baseUrl
      ),
      provider
    ),
    baseURL: normalizeProviderBaseUrl(
      firstString(
        overrides.baseURL,
        overrides.apiUrl,
        dialogue.apiKey ? dialogue.baseUrl : stored.baseUrl
      ),
      provider
    ),
    model: firstString(overrides.model, dialogue.apiKey ? dialogue.model : stored.model, model),
    temperature: overrides.temperature,
    maxTokens: overrides.maxTokens,
    topP: overrides.topP,
    frequencyPenalty: overrides.frequencyPenalty,
    presencePenalty: overrides.presencePenalty,
  };
}

export async function loadRemoteVideoGatewaySettings(): Promise<RemoteVideoGatewaySettings> {
  const secure = parseStoredObject(await secureStorage.getSecureConfig('remote_video_gateway'));
  const legacy = parseStoredObject(readLocal('novella_remote_video_gateway'));
  const service = parseStoredObject(await secureStorage.getSecureConfig('ai_service_video'));
  return normalizeRemoteVideoGatewaySettings({
    ...(service ?? {}),
    ...(legacy ?? {}),
    ...(secure ?? {}),
  });
}

export async function saveRemoteVideoGatewaySettings(
  value: RemoteVideoGatewaySettings
): Promise<void> {
  await secureStorage.saveSecureConfig(
    'remote_video_gateway',
    JSON.stringify(normalizeRemoteVideoGatewaySettings(value))
  );
}

export function getProviderBaseUrlMap(): Record<string, string> {
  return { ...DEFAULT_PROVIDER_BASE_URLS };
}

export function resolveConfiguredEndpoint(
  configuredBaseUrl: string,
  fallbackEndpoint: string
): string {
  const base = configuredBaseUrl.trim().replace(/\/$/, '');
  if (!base) return fallbackEndpoint;
  if (/\/(?:chat\/completions|messages|generations|videos)(?:\/|$)/i.test(base)) return base;

  try {
    const fallback = new URL(fallbackEndpoint);
    const configured = new URL(base);
    const versionMarker = fallback.pathname.match(/\/v\d+(?:beta)?/i);
    const suffix = versionMarker
      ? fallback.pathname.slice(versionMarker.index! + versionMarker[0].length)
      : fallback.pathname;
    configured.pathname = `${configured.pathname.replace(/\/$/, '')}${suffix || ''}`;
    return configured.toString().replace(/\/$/, '');
  } catch {
    return fallbackEndpoint;
  }
}

export function resolveOpenAICompatibleEndpoint(
  configuredBaseUrl: string,
  fallbackEndpoint: string
): string {
  const base = configuredBaseUrl.trim().replace(/\/$/, '');
  if (!base) return fallbackEndpoint;
  if (/\/chat\/completions(?:\/|$)/i.test(base)) return base;
  return `${base}/chat/completions`;
}

export function resolveAnthropicEndpoint(configuredBaseUrl: string): string {
  const base = configuredBaseUrl.trim().replace(/\/$/, '');
  if (!base) return 'https://api.anthropic.com/v1/messages';
  return /\/messages(?:\/|$)/i.test(base) ? base : `${base}/messages`;
}

const DIALOGUE_PROXY_PREFIX = '/__novella_dialogue_proxy';

/**
 * Vite replaces the flag only in an explicitly configured development server.
 * The proxy target remains server-side, while the browser only retains the
 * configured endpoint's path and query string.
 */
export function resolveDialogueTransportEndpoint(endpoint: string): string {
  if (
    typeof NOVELLA_VITE_DIALOGUE_PROXY_ENABLED === 'undefined' ||
    !NOVELLA_VITE_DIALOGUE_PROXY_ENABLED
  ) {
    return endpoint;
  }

  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:') return endpoint;
    return `${DIALOGUE_PROXY_PREFIX}${url.pathname}${url.search}`;
  } catch {
    return endpoint;
  }
}

export function resolveGoogleEndpoint(configuredBaseUrl: string, model: string): string {
  const base = configuredBaseUrl.trim().replace(/\/$/, '');
  if (!base)
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  if (/\/generateContent(?:\?|$)/i.test(base)) return base;
  const versionPath = base.match(/\/v\d+(?:beta\d*)?$/i) ? base : `${base}/v1beta`;
  return `${versionPath}/models/${encodeURIComponent(model)}:generateContent`;
}

export type SupportedProvider = ModelProvider | string;
