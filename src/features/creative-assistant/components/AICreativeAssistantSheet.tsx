import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  ImagePlus,
  MessageCircleMore,
  Plus,
  RotateCcw,
  Send,
  Square,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import type { DialogueStreamEvent } from '@/core/ai/dialogue-stream-events';
import type { AIRequestConfig } from '@/core/ai/types/ai-core';
import { aiService } from '@/core/services';
import {
  createCreativeAssistantAgent,
  type CreativeAssistantAgent,
} from '@/core/services/ai/assistant-agent';
import {
  assistantSkillRegistry,
  PRODUCT_ASSISTANT_SKILL_IDS,
  type AssistantSkillId,
  type CatalogAssistantSkillId,
} from '@/core/services/ai/assistant-skills';
import { ConfiguredDialogueError } from '@/core/services/ai/text/ai-service';
import { Button } from '@/shared/components/ui/button';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/utils/class-names';

import { createAgentTimeline, failRunningAgentSteps, finishAgentTimeline } from '../agent-timeline';
import { ASSISTANT_CHAT_SURFACE } from '../assistant-chat-surface';
import { rowsFromAssistantState, rowsFromMemorySummary } from '../assistant-info-layout';
import { looksLikeStructuredDraft, isSameStructuredDraft } from '../candidate-preview';
import {
  buildCreativeAssistantSystemPrompt,
  clearCreativeAssistantMemory,
  formatCreativeAssistantMemory,
  hideCreativeAssistantStateMarker,
  isCreativeAssistantStateApplied,
  loadCreativeAssistantMemory,
  mergeCreativeAssistantMemory,
  parseCreativeAssistantResponse,
  saveCreativeAssistantMemory,
} from '../creative-assistant-memory';
import {
  loadCreativeAssistantSession,
  saveCreativeAssistantSession,
} from '../creative-assistant-session';
import { assistantUIReducer, createAssistantUIState } from '../creative-assistant-ui-reducer';
import { isImageGenerationRequest } from '../image-generation-intent';
import type {
  CreativeAssistantAttachment,
  CreativeAssistantMessage,
  CreativeAssistantState,
  GeneratedImageAsset,
} from '../types';

import { AgentThinkingTrace } from './AgentThinkingTrace';
import { AssistantChatBubble } from './AssistantChatBubble';
import { AssistantInfoCard } from './AssistantInfoCard';
import { AssistantMarkdown } from './AssistantMarkdown';
import { CandidatePreview } from './CandidatePreview';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 4;
const SUPPORTED_IMAGE_TYPES = new Set<CreativeAssistantAttachment['mimeType']>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export interface AICreativeAssistantSheetProps<T> {
  projectId?: string;
  targetLabel: string;
  projectContext: string;
  candidateInstructions: string;
  parseCandidate: (raw: string) => T;
  onApply: (candidate: T) => void;
  autoPreviewCandidate?: boolean;
  onPersist?: () => void | boolean | Promise<void | boolean>;
  persistLabel?: string;
  onGenerateImage?: (
    prompt: string,
    latestImage?: GeneratedImageAsset
  ) => Promise<GeneratedImageAsset>;
  resolveGeneratedImageUrl?: (image: GeneratedImageAsset) => string | Promise<string>;
  generatedImageEvents?: GeneratedImageAsset[];
}

function messageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function attachmentId(): string {
  return `attachment-${messageId()}`;
}

function AssistantGeneratedImage({
  image,
  resolveUrl,
}: {
  image: GeneratedImageAsset;
  resolveUrl?: (image: GeneratedImageAsset) => string | Promise<string>;
}) {
  const [source, setSource] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let active = true;
    let loadedSource = '';
    setSource('');
    setState('loading');
    void Promise.resolve(resolveUrl?.(image) || image.previewUrl)
      .then((nextSource) => {
        loadedSource = nextSource;
        if (!active) {
          if (nextSource.startsWith('blob:')) URL.revokeObjectURL(nextSource);
          return;
        }
        if (!nextSource) {
          setState('failed');
          return;
        }
        setSource(nextSource);
      })
      .catch(() => {
        if (active) setState('failed');
      });
    return () => {
      active = false;
      if (loadedSource.startsWith('blob:')) URL.revokeObjectURL(loadedSource);
    };
  }, [image, resolveUrl]);

  return (
    <figure className="space-y-1">
      <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-md border border-indigo-300/30 bg-slate-950">
        {state === 'loading' && <span className="text-xs text-slate-400">图片加载中...</span>}
        {state === 'failed' ? (
          <span className="px-3 text-center text-xs text-rose-300">
            图片加载失败，请检查项目工作目录
          </span>
        ) : source ? (
          <img
            src={source}
            alt={`AI 生成图片：${image.prompt}`}
            className={cn(
              'absolute inset-0 h-full w-full object-contain transition-opacity',
              state === 'ready' ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setState('ready')}
            onError={() => setState('failed')}
          />
        ) : null}
      </div>
      <figcaption className="break-all text-[11px] text-slate-400">
        <span className="block text-slate-300">{image.prompt}</span>
        <span className="block">{image.relativePath ?? '浏览器临时地址'}</span>
      </figcaption>
    </figure>
  );
}

function AssistantReplyBody({
  content,
  live,
  candidateRaw,
}: {
  content: string;
  live: boolean;
  candidateRaw: string | null;
}) {
  if (!looksLikeStructuredDraft(content)) {
    return <AssistantMarkdown content={content} />;
  }
  if (live) {
    return <p className="text-sm text-slate-200">正在整理草稿…</p>;
  }
  if (candidateRaw && isSameStructuredDraft(content, candidateRaw)) {
    return <p className="text-sm text-slate-200">草稿已放到下方候选稿，请核对后保存。</p>;
  }
  return <CandidatePreview value={content} />;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`无法读取图片：${file.name}`));
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error(`无法读取图片：${file.name}`));
    reader.readAsDataURL(file);
  });
}

function toRequestMessage(message: CreativeAssistantMessage): AIRequestConfig['messages'][number] {
  const text = message.content.trim() || '请分析我附上的图片。';
  if (!message.attachments?.length) return { role: message.role, content: text };
  return {
    role: message.role,
    content: [
      { type: 'text', text },
      ...message.attachments.map((attachment) => ({
        type: 'image_url' as const,
        image_url: { url: attachment.dataUrl },
      })),
    ],
  };
}

function compactConversation(messages: CreativeAssistantMessage[]): CreativeAssistantMessage[] {
  const selected: CreativeAssistantMessage[] = [];
  let textLength = 0;
  let imageCount = 0;

  for (const message of [...messages].reverse()) {
    if (selected.length >= 16 || textLength >= 12000) break;
    const remainingImages = MAX_ATTACHMENTS - imageCount;
    const nextAttachments = message.attachments?.slice(0, Math.max(remainingImages, 0));
    const nextContent = message.content.slice(0, Math.max(12000 - textLength, 0));
    selected.push({ ...message, content: nextContent, attachments: nextAttachments });
    textLength += nextContent.length;
    imageCount += nextAttachments?.length ?? 0;
  }

  return selected.reverse();
}

const TRANSCRIPT_NEAR_BOTTOM_PX = 96;

function transcriptViewport(end: HTMLElement | null): HTMLElement | null {
  const viewport = end?.closest('[data-radix-scroll-area-viewport]');
  return viewport instanceof HTMLElement ? viewport : null;
}

function isTranscriptNearBottom(end: HTMLElement | null): boolean {
  const viewport = transcriptViewport(end);
  if (!viewport) return true;
  return (
    viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= TRANSCRIPT_NEAR_BOTTOM_PX
  );
}

function scrollTranscriptToLatest(end: HTMLElement | null): void {
  if (!end) return;
  const viewport = transcriptViewport(end);
  if (viewport) viewport.scrollTop = viewport.scrollHeight;
  end.scrollIntoView({ block: 'end', behavior: 'auto' });
}

async function* configuredDialogueEvents(
  requestMessages: AIRequestConfig['messages'],
  signal?: AbortSignal
): AsyncGenerator<DialogueStreamEvent> {
  if (typeof aiService.streamConfiguredDialogueEvents === 'function') {
    const events = aiService.streamConfiguredDialogueEvents(requestMessages, { signal });
    if (events && typeof events[Symbol.asyncIterator] === 'function') {
      yield* events;
      return;
    }
  }
  for await (const text of aiService.streamConfiguredDialogue(requestMessages, { signal })) {
    yield { kind: 'text', text };
  }
}

function formatAssistantError(error: unknown): string {
  if (error instanceof ConfiguredDialogueError) {
    if (error.kind === 'http') {
      const statusGuidance: Record<number, string> = {
        401: '密钥无效、缺失或已过期。',
        403: '当前密钥没有调用该模型的权限。',
        404: '请求地址或模型 ID 不存在。',
        429: '服务限流或账户额度不足。',
      };
      return `对话服务返回 HTTP ${error.status}。${statusGuidance[error.status ?? 0] ?? '请检查服务状态、请求地址和模型配置。'}`;
    }
    return `无法连接到 ${error.host}。请检查网络和请求地址；浏览器模式还需要服务端允许 http://127.0.0.1:1420 跨域访问，桌面端仅支持 HTTPS 自定义地址。`;
  }
  const message = error instanceof Error ? error.message : '未知错误';
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return '无法连接到已配置的对话服务。请检查请求地址、网络连接，以及该服务是否允许本地应用访问。';
  }
  if (/未配置|已关闭|不支持的对话协议/.test(message)) return message;
  return `AI 对话失败：${message}`;
}

export function AICreativeAssistantSheet<T>({
  projectId,
  targetLabel,
  projectContext,
  candidateInstructions,
  parseCandidate,
  onApply,
  autoPreviewCandidate = false,
  onPersist,
  persistLabel = '保存',
  onGenerateImage,
  resolveGeneratedImageUrl,
  generatedImageEvents = [],
}: AICreativeAssistantSheetProps<T>) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<CreativeAssistantAttachment[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<CatalogAssistantSkillId[]>([]);
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [uiState, dispatch] = useReducer(
    assistantUIReducer<T>,
    undefined,
    createAssistantUIState<T>
  );
  const {
    messages,
    candidate,
    candidateRaw,
    error,
    generating,
    memory,
    memoryReady,
    sessionReady,
    streamingMessageId,
    conversationVersion,
  } = uiState;
  const controllerRef = useRef<AbortController | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const skillMenuRef = useRef<HTMLDivElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const stickToLatestRef = useRef(true);
  const initializedConversationRef = useRef<string | null>(null);
  const skipNextInitializationRef = useRef(false);
  const retryRequestsRef = useRef<
    Record<
      string,
      {
        requestMessages: AIRequestConfig['messages'];
        onComplete?: (
          content: string,
          state: CreativeAssistantState | null,
          assistantId: string
        ) => string | void | Promise<string | void>;
      }
    >
  >({});
  const loadedSessionProjectRef = useRef<string | undefined>(undefined);
  const loadedMemoryProjectRef = useRef<string | undefined>(undefined);
  const generateCandidateRef = useRef<(() => void) | null>(null);
  const seenGeneratedImageEventsRef = useRef<Set<string>>(new Set());
  const agentRef = useRef<CreativeAssistantAgent<CreativeAssistantState, T> | null>(null);

  useEffect(() => {
    if (sessionReady && loadedSessionProjectRef.current === projectId) {
      saveCreativeAssistantSession(projectId, messages);
    }
  }, [messages, projectId, sessionReady]);

  useEffect(() => {
    const hasMemory = Boolean(
      memory.intent ||
      memory.target ||
      memory.constraints.length ||
      memory.confirmedFacts.length ||
      memory.openQuestions.length ||
      memory.glossary.length
    );
    if (memoryReady && loadedMemoryProjectRef.current === projectId && hasMemory) {
      saveCreativeAssistantMemory(projectId, memory);
    }
  }, [memory, memoryReady, projectId]);

  useEffect(() => {
    loadedSessionProjectRef.current = projectId;
    loadedMemoryProjectRef.current = projectId;
    dispatch({
      type: 'hydrate',
      messages: loadCreativeAssistantSession(projectId),
      memory: loadCreativeAssistantMemory(projectId),
    });
    initializedConversationRef.current = null;
    seenGeneratedImageEventsRef.current = new Set();
  }, [projectId]);

  useEffect(() => {
    if (!sessionReady || generatedImageEvents.length === 0) return;
    const unseen = generatedImageEvents.filter(
      (image) => !seenGeneratedImageEventsRef.current.has(image.id)
    );
    if (unseen.length === 0) return;
    unseen.forEach((image) => seenGeneratedImageEventsRef.current.add(image.id));
    dispatch({ type: 'external-images-added', images: unseen });
  }, [generatedImageEvents, sessionReady]);

  const scrollToLatest = useCallback(() => {
    scrollTranscriptToLatest(transcriptEndRef.current);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      stickToLatestRef.current = true;
      return undefined;
    }
    stickToLatestRef.current = true;
    scrollToLatest();
    const frame = window.requestAnimationFrame(scrollToLatest);
    const timers = [80, 320, 520].map((delayMs) => window.setTimeout(scrollToLatest, delayMs));
    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [open, scrollToLatest]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const last = messages[messages.length - 1];
    if (last?.role === 'user') stickToLatestRef.current = true;
    if (!stickToLatestRef.current) return undefined;
    scrollToLatest();
    const frame = window.requestAnimationFrame(scrollToLatest);
    return () => window.cancelAnimationFrame(frame);
  }, [open, messages, error, candidateRaw, generating, scrollToLatest]);

  useEffect(() => {
    if (!open) return undefined;
    const viewport = transcriptViewport(transcriptEndRef.current);
    if (!viewport) return undefined;
    const onScroll = () => {
      stickToLatestRef.current = isTranscriptNearBottom(transcriptEndRef.current);
    };
    viewport.addEventListener('scroll', onScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', onScroll);
  }, [open]);

  const stopGeneration = () => {
    agentRef.current?.cancel();
    controllerRef.current?.abort();
  };

  const updateAssistantMessage = useCallback(
    (id: string, patch: Partial<CreativeAssistantMessage>) => {
      dispatch({ type: 'assistant-patched', assistantId: id, patch });
    },
    []
  );

  const buildRequestMessages = useCallback(
    (
      instruction: string,
      conversation: CreativeAssistantMessage[],
      includeStateContract = true
    ): AIRequestConfig['messages'] => [
      {
        role: 'system',
        content: buildCreativeAssistantSystemPrompt({
          targetLabel,
          instruction,
          memory,
          includeStateContract,
          enabledSkills: assistantSkillRegistry.enabled([
            ...PRODUCT_ASSISTANT_SKILL_IDS,
            ...selectedSkillIds,
          ]),
          selectedSkillIds,
        }),
      },
      {
        role: 'user',
        content: `项目上下文（每次对话均以最新项目数据为准）：\n${projectContext.slice(0, 16000) || '项目正文暂未填写。'}\n\n已确认项目记忆（仅供参考，不得覆盖当前项目数据）：\n${formatCreativeAssistantMemory(memory)}`,
      },
      ...compactConversation(conversation).map(toRequestMessage),
    ],
    [memory, projectContext, selectedSkillIds, targetLabel]
  );

  const runStream = useCallback(
    async (
      requestMessages: AIRequestConfig['messages'],
      onComplete?: (
        content: string,
        state: CreativeAssistantState | null,
        assistantId: string
      ) => string | void | Promise<string | void>,
      existingAssistantId?: string,
      options: {
        followUpSkills?: boolean;
        initialSkillIds?: AssistantSkillId[];
        completeOnStreamError?: boolean;
      } = {}
    ) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const assistantId = existingAssistantId ?? messageId();
      retryRequestsRef.current[assistantId] = { requestMessages, onComplete };
      let response = '';
      const selectedCatalogIds = (options.initialSkillIds ?? []).filter(
        (id): id is CatalogAssistantSkillId =>
          assistantSkillRegistry.get(id)?.visibility === 'user-selectable'
      );
      const enabledSkillIds = [...PRODUCT_ASSISTANT_SKILL_IDS, ...selectedCatalogIds];
      const skillLabels = selectedCatalogIds
        .map((id) => assistantSkillRegistry.get(id)?.label)
        .filter((label): label is string => Boolean(label));
      let agentSteps = createAgentTimeline(skillLabels);
      let followUpCandidate = false;
      dispatch({
        type: 'turn-started',
        assistantId,
        message: existingAssistantId
          ? {
              id: assistantId,
              role: 'assistant',
              content: '',
              thinking: undefined,
              state: undefined,
              skillCalls: undefined,
              agentSteps,
              generatedImages: undefined,
            }
          : { id: assistantId, role: 'assistant', content: '', agentSteps },
        agentSteps,
      });
      try {
        const agent = createCreativeAssistantAgent<CreativeAssistantState, T>({
          projectId: projectId ?? targetLabel,
          dialogue: {
            stream: (_messages, signal) => configuredDialogueEvents(requestMessages, signal),
          },
          prompt: {
            buildMessages: () =>
              requestMessages.map(({ role, content }) => ({
                role,
                content:
                  typeof content === 'string'
                    ? content
                    : content
                        .map((part) => (part.type === 'text' ? part.text : '[image attachment]'))
                        .join('\n'),
              })),
            parseResponse: (raw) => {
              const parsed = parseCreativeAssistantResponse(raw);
              return {
                content: parsed.content,
                state: parsed.state,
                skillId: parsed.skillId,
              };
            },
          },
          image: onGenerateImage
            ? { generate: (prompt, latestImage) => onGenerateImage(prompt, latestImage) }
            : undefined,
          target: {
            parseCandidate,
            applyCandidate: onApply,
            persist: async () => (onPersist ? onPersist() : false),
          },
          id: () => assistantId,
        });
        agentRef.current = agent;
        for await (const event of agent.sendTurn({
          text: '',
          selectedSkillIds: options.initialSkillIds ?? [],
        })) {
          if (event.type === 'text') {
            response += event.text;
            updateAssistantMessage(assistantId, {
              content: hideCreativeAssistantStateMarker(response),
            });
          }
          if (event.type === 'cancelled') {
            controller.abort();
          }
          if (event.type === 'failed') {
            throw event.error;
          }
        }
        if (controller.signal.aborted) {
          agentSteps = failRunningAgentSteps(agentSteps);
          dispatch({ type: 'turn-cancelled', assistantId, agentSteps });
          toast.info('已停止 AI 回复，已收到的内容已保留');
        } else {
          agentSteps = finishAgentTimeline(agentSteps);
          const parsed = parseCreativeAssistantResponse(response);
          const modelSkillCall = parsed.skillId
            ? assistantSkillRegistry.resolve(parsed.skillId, enabledSkillIds)
            : null;
          const completionError = await onComplete?.(parsed.content, parsed.state, assistantId);
          dispatch({
            type: 'turn-completed',
            assistantId,
            content: parsed.content,
            error: typeof completionError === 'string' ? completionError : undefined,
            state: parsed.state,
            skillCalls: modelSkillCall ? [modelSkillCall] : undefined,
            agentSteps,
          });
          delete retryRequestsRef.current[assistantId];
          followUpCandidate =
            options.followUpSkills !== false &&
            modelSkillCall?.status === 'accepted' &&
            modelSkillCall.id === 'propose-candidate';
        }
      } catch (streamError) {
        if (controller.signal.aborted) {
          agentSteps = failRunningAgentSteps(agentSteps);
          dispatch({ type: 'turn-cancelled', assistantId, agentSteps });
          toast.info('已停止 AI 回复，已收到的内容已保留');
        } else {
          agentSteps = failRunningAgentSteps(agentSteps);
          const completionError = options.completeOnStreamError
            ? await onComplete?.('', null, assistantId)
            : undefined;
          dispatch({
            type: 'turn-failed',
            assistantId,
            error:
              typeof completionError === 'string'
                ? completionError
                : options.completeOnStreamError && onComplete
                  ? ''
                  : formatAssistantError(streamError),
            content: options.completeOnStreamError && onComplete ? undefined : '本次请求未完成。',
            agentSteps,
          });
        }
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        if (followUpCandidate) {
          queueMicrotask(() => generateCandidateRef.current?.());
        }
      }
    },
    [updateAssistantMessage]
  );

  const retryMessage = (assistantId: string) => {
    if (generating) return;
    const request = retryRequestsRef.current[assistantId];
    if (!request) return;
    void runStream(request.requestMessages, request.onComplete, assistantId);
  };

  const removeMessage = (id: string) => {
    if (generating) return;
    delete retryRequestsRef.current[id];
    dispatch({ type: 'message-removed', messageId: id });
  };

  const sendMessage = () => {
    const content = input.trim();
    if ((!content && attachments.length === 0) || generating) return;
    const nextMessages = [
      ...messages,
      { id: messageId(), role: 'user' as const, content, attachments },
    ];
    dispatch({ type: 'message-added', message: nextMessages[nextMessages.length - 1] });
    setInput('');
    setAttachments([]);
    const selectedThisTurn = selectedSkillIds;
    const selectedCatalog = selectedThisTurn
      .map((id) => assistantSkillRegistry.get(id))
      .filter(
        (skill): skill is NonNullable<typeof skill> => skill?.visibility === 'user-selectable'
      );
    const catalogInstruction = selectedCatalog
      .map((skill) => skill.instruction)
      .filter(Boolean)
      .join('\n');
    setSelectedSkillIds([]);
    setSkillMenuOpen(false);
    const shouldGenerateImage = Boolean(onGenerateImage && isImageGenerationRequest(content));
    const latestGeneratedImage = [...messages]
      .reverse()
      .flatMap((message) => message.generatedImages ?? [])[0];
    void runStream(
      buildRequestMessages(
        catalogInstruction
          ? `${catalogInstruction}\n\n请根据项目上下文和当前对话执行用户点选的技能。${selectedCatalog.length >= 2 ? '多个技能的结果都要保留，结尾只用「本轮结论」问一件事。' : ''}正文不要输出 JSON；按系统约定追加状态标记，也不要声称已经回填表单。`
          : '请先根据项目上下文和当前对话澄清需求，提出必要问题或给出可执行建议。正文不要输出 JSON；按系统约定追加状态标记，也不要声称已经回填表单。',
        nextMessages
      ),
      shouldGenerateImage
        ? async (assistantContent, _state, assistantId) => {
            try {
              const generated = await onGenerateImage!(content, latestGeneratedImage);
              updateAssistantMessage(assistantId, {
                content: assistantContent || '参考图已生成，可继续描述需要调整的内容。',
                generatedImages: [generated],
              });
              dispatch({ type: 'error-cleared' });
            } catch (generationError) {
              const errorMessage =
                generationError instanceof Error
                  ? generationError.message
                  : '图片生成失败，请稍后重试';
              updateAssistantMessage(assistantId, {
                content: assistantContent || '图片生成未完成，请检查图片服务配置后重试。',
              });
              return errorMessage;
            }
          }
        : undefined,
      undefined,
      {
        initialSkillIds: selectedThisTurn,
        completeOnStreamError: shouldGenerateImage,
      }
    );
  };

  const generateCandidate = () => {
    dispatch({ type: 'candidate-cleared' });
    void runStream(
      buildRequestMessages(
        `基于已确认的需求生成可回填到“${targetLabel}”的最终候选稿。严格遵守以下输出约束，不要解释：\n${candidateInstructions}`,
        messages,
        false
      ),
      (raw) => {
        dispatch({ type: 'candidate-raw', raw });
        try {
          const value = parseCandidate(raw);
          dispatch({ type: 'candidate-parsed', raw, value });
          agentRef.current?.createCandidate(raw);
          if (autoPreviewCandidate) {
            onApply(value);
            toast.success(`${targetLabel}已回填到左侧草稿，确认保存后才会写入已确认角色`);
          }
        } catch (parseError) {
          const message =
            parseError instanceof Error
              ? parseError.message
              : '候选稿格式无效，请继续澄清或重新生成';
          return /JSON at position|Unexpected token|Unexpected end|Expected ','|Expected ']'/i.test(
            message
          )
            ? '候选稿 JSON 不完整或被截断。请复制后继续澄清，或重新生成。'
            : message;
        }
      },
      undefined,
      { followUpSkills: false, initialSkillIds: ['propose-candidate'] }
    );
  };
  generateCandidateRef.current = generateCandidate;

  const selectAttachments = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    const available = MAX_ATTACHMENTS - attachments.length;
    if (selected.length > available) toast.warning(`单次对话最多附加 ${MAX_ATTACHMENTS} 张图片`);
    const supported = selected.slice(0, available).filter((file) => {
      if (!SUPPORTED_IMAGE_TYPES.has(file.type as CreativeAssistantAttachment['mimeType'])) {
        toast.warning(`暂不支持图片格式：${file.name}`);
        return false;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.warning(`图片不能超过 5 MB：${file.name}`);
        return false;
      }
      return true;
    });

    try {
      const nextAttachments = await Promise.all(
        supported.map(async (file) => ({
          id: attachmentId(),
          name: file.name,
          mimeType: file.type as CreativeAssistantAttachment['mimeType'],
          dataUrl: await readFileAsDataUrl(file),
        }))
      );
      setAttachments((items) => [...items, ...nextAttachments]);
    } catch (readError) {
      dispatch({ type: 'error-set', error: formatAssistantError(readError) });
    }
  };

  const copyCandidate = async () => {
    if (!candidateRaw) return;
    try {
      await navigator.clipboard.writeText(candidateRaw);
      toast.success('候选稿已复制');
    } catch {
      toast.error('复制失败，请手动选择候选稿内容');
    }
  };

  const persistCandidate = () => {
    if (!onPersist) return;
    if (agentRef.current) {
      void agentRef.current.persistCandidate().then((result) => {
        if (result.status === 'saved') toast.success(`${targetLabel} saved`);
      });
      return;
    }
    void Promise.resolve(onPersist()).then((saved) => {
      if (saved === false) return;
      toast.success(`${targetLabel}已保存`);
    });
  };

  const applyCandidate = () => {
    if (!candidate) return;
    if (agentRef.current) {
      void agentRef.current.applyCandidate();
    } else {
      onApply(candidate.value);
    }
    setConfirmOpen(false);
    setOpen(false);
    toast.success(`${targetLabel}已填充到表单，请继续检查并保存`);
  };

  const saveMessageState = (message: CreativeAssistantMessage) => {
    if (
      !projectId ||
      !message.state ||
      message.stateSaved ||
      isCreativeAssistantStateApplied(message.state, memory)
    )
      return;
    dispatch({
      type: 'memory-updated',
      memory: mergeCreativeAssistantMemory(memory, message.state!),
    });
    void agentRef.current?.saveMemory(message.state!);
    dispatch({ type: 'message-state-saved', messageId: message.id });
    toast.success('本轮确认内容已保存到当前项目记忆');
  };

  const clearProjectMemory = () => {
    clearCreativeAssistantMemory(projectId);
    dispatch({ type: 'project-memory-cleared' });
    toast.success('当前项目记忆已清除');
  };

  const startNewConversation = () => {
    stopGeneration();
    dispatch({ type: 'conversation-cleared' });
    setAttachments([]);
    setInput('');
    retryRequestsRef.current = {};
  };

  const clearConversation = () => {
    stopGeneration();
    dispatch({ type: 'conversation-cleared' });
    setAttachments([]);
    setInput('');
    retryRequestsRef.current = {};
    skipNextInitializationRef.current = true;
  };

  useEffect(() => {
    const conversationKey = `${projectId ?? targetLabel}:${conversationVersion}`;
    if (skipNextInitializationRef.current) {
      skipNextInitializationRef.current = false;
      initializedConversationRef.current = conversationKey;
      return;
    }
    if (
      !open ||
      !sessionReady ||
      messages.length > 0 ||
      generating ||
      initializedConversationRef.current === conversationKey
    )
      return;

    initializedConversationRef.current = conversationKey;
    void runStream(
      buildRequestMessages(
        '请先阅读项目上下文，简要确认你理解的创作目标，并提出一个最关键的澄清问题。正文不要输出 JSON；按系统约定追加状态标记，不要修改或声称已经回填表单。',
        []
      )
    );
  }, [
    buildRequestMessages,
    conversationVersion,
    generating,
    messages.length,
    open,
    projectContext,
    projectId,
    runStream,
    sessionReady,
    targetLabel,
  ]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      stopGeneration();
      setSkillMenuOpen(false);
    }
    setOpen(nextOpen);
  };

  const toggleSelectedSkill = useCallback((skillId: CatalogAssistantSkillId) => {
    setSelectedSkillIds((ids) =>
      ids.includes(skillId) ? ids.filter((id) => id !== skillId) : [...ids, skillId]
    );
  }, []);

  useEffect(() => {
    if (!skillMenuOpen) return undefined;
    const closeOnOutside = (event: MouseEvent) => {
      if (!skillMenuRef.current?.contains(event.target as Node)) {
        setSkillMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setSkillMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [skillMenuOpen]);

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="absolute right-4 top-4 z-10 border-indigo-400/40 bg-slate-950/90 text-indigo-300 shadow-lg hover:bg-indigo-500 hover:text-white"
        aria-label={`打开${targetLabel} AI 助手`}
        title={`${targetLabel} AI 助手`}
        onClick={() => setOpen(true)}
      >
        <MessageCircleMore />
      </Button>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className={cn(
            'flex h-dvh w-full flex-col border-slate-800 p-0 sm:max-w-md',
            ASSISTANT_CHAT_SURFACE.panel
          )}
        >
          <SheetHeader className="space-y-2 border-b border-slate-800 px-5 py-4 pr-14 text-left">
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="flex min-w-0 items-center gap-2 text-slate-100">
                <WandSparkles className="h-5 w-5 shrink-0 text-indigo-400" />
                AI 创作助手
              </SheetTitle>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-white"
                  title="新建对话"
                  aria-label="新建对话"
                  onClick={startNewConversation}
                  disabled={generating}
                >
                  <Plus />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-rose-300"
                  title="清空当前对话"
                  aria-label="清空当前对话"
                  onClick={clearConversation}
                  disabled={generating || messages.length === 0}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            <SheetDescription className="text-slate-400">
              当前回填目标：{targetLabel} · 项目记忆需确认后保存
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1 px-4 py-4">
            <div className="space-y-3 pr-3" aria-live="polite">
              {projectId && (
                <div
                  data-testid="creative-assistant-memory-panel"
                  className={ASSISTANT_CHAT_SURFACE.memory}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium !text-white">
                      <BookOpen className="h-4 w-4" />
                      项目记忆
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-rose-300"
                      title="清除当前项目记忆"
                      aria-label="清除当前项目记忆"
                      onClick={clearProjectMemory}
                      disabled={
                        !memory.intent &&
                        memory.confirmedFacts.length === 0 &&
                        memory.glossary.length === 0
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {memory.confirmedFacts.length > 0 ||
                  memory.constraints.length > 0 ||
                  memory.glossary.length > 0 ? (
                    <div className="space-y-2">
                      <AssistantInfoCard tone="embedded" rows={rowsFromMemorySummary(memory)} />
                      {memory.confirmedFacts.length +
                        memory.constraints.length +
                        memory.glossary.length >
                        7 && (
                        <p className={ASSISTANT_CHAT_SURFACE.muted}>其余记忆会继续随请求携带。</p>
                      )}
                    </div>
                  ) : (
                    <p className={ASSISTANT_CHAT_SURFACE.muted}>
                      暂无已确认记忆。保存本轮识别内容后，新对话会自动携带。
                    </p>
                  )}
                </div>
              )}
              {messages.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-600 p-4 text-sm text-slate-200">
                  描述想调整的内容，AI 会先与您澄清细节。
                </p>
              )}
              {messages.map((message) => (
                <AssistantChatBubble key={message.id} role={message.role}>
                  <div className="mb-1 flex justify-end gap-1">
                    {message.role === 'assistant' &&
                      retryRequestsRef.current[message.id] &&
                      message.content === '本次请求未完成。' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-indigo-300"
                          title="重试本次请求"
                          aria-label="重试本次请求"
                          onClick={() => retryMessage(message.id)}
                          disabled={generating}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={
                        message.role === 'user'
                          ? 'h-6 w-6 text-slate-400 hover:text-rose-600'
                          : 'h-6 w-6 text-slate-500 hover:text-rose-300'
                      }
                      title="删除消息"
                      aria-label="删除消息"
                      onClick={() => removeMessage(message.id)}
                      disabled={generating}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {message.agentSteps?.length ? (
                    <AgentThinkingTrace
                      steps={message.agentSteps}
                      live={streamingMessageId === message.id}
                    />
                  ) : null}
                  {message.skillCalls?.length ? (
                    <div className={cn('mb-2 space-y-1 text-xs', ASSISTANT_CHAT_SURFACE.muted)}>
                      {message.skillCalls.map((call, index) => (
                        <p key={`${message.id}-skill-${call.id}-${index}`}>
                          技能 {assistantSkillRegistry.get(call.id)?.label ?? call.id}
                          {call.status === 'accepted'
                            ? ' · 已调用'
                            : ` · 已拒绝${call.reason ? `：${call.reason}` : ''}`}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {message.content ? (
                    message.role === 'assistant' ? (
                      <AssistantReplyBody
                        content={message.content}
                        live={streamingMessageId === message.id}
                        candidateRaw={candidateRaw}
                      />
                    ) : (
                      <div className="space-y-2">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    )
                  ) : message.attachments?.length ? (
                    '请分析附件图片。'
                  ) : streamingMessageId === message.id ? null : (
                    <p className="text-sm text-slate-300">
                      {message.agentSteps?.some((step) => step.status === 'failed')
                        ? '已停止，没有可见回复。'
                        : '本轮没有生成可见回复。'}
                    </p>
                  )}
                  {message.attachments?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.attachments.map((attachment) => (
                        <img
                          key={attachment.id}
                          src={attachment.dataUrl}
                          alt={attachment.name}
                          className="h-16 w-16 rounded border border-indigo-300/30 object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                  {message.generatedImages?.length ? (
                    <div
                      className="mt-3 space-y-2"
                      data-testid="creative-assistant-generated-images"
                    >
                      {message.generatedImages.map((image) => (
                        <AssistantGeneratedImage
                          key={image.id}
                          image={image}
                          resolveUrl={resolveGeneratedImageUrl}
                        />
                      ))}
                    </div>
                  ) : null}
                  {message.role === 'assistant' && message.state && (
                    <AssistantInfoCard
                      className="mt-3"
                      tone="notice"
                      title="本轮识别结果（确认后才会记住）"
                      rows={rowsFromAssistantState(message.state)}
                      footer={
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => saveMessageState(message)}
                            disabled={
                              !projectId ||
                              Boolean(message.stateSaved) ||
                              isCreativeAssistantStateApplied(message.state, memory)
                            }
                          >
                            {message.stateSaved ||
                            isCreativeAssistantStateApplied(message.state, memory)
                              ? '已保存到项目记忆'
                              : '保存本轮记忆'}
                          </Button>
                          {autoPreviewCandidate &&
                            (message.stateSaved ||
                              isCreativeAssistantStateApplied(message.state, memory)) && (
                              <p className="text-[11px] text-slate-500">
                                项目记忆不会填写左侧表单。完整角色与剧情大纲请在候选稿区点「
                                {persistLabel}」。
                              </p>
                            )}
                        </>
                      }
                    />
                  )}
                </AssistantChatBubble>
              ))}
              {error && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {error}
                </div>
              )}
              {candidateRaw && (
                <div className="space-y-3 rounded-lg border border-emerald-400/40 bg-emerald-950/40 p-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-100">
                      {candidate
                        ? autoPreviewCandidate
                          ? '已回填到左侧草稿'
                          : '可回填候选稿'
                        : '候选稿原文'}
                    </p>
                    <p className={cn('text-xs', ASSISTANT_CHAT_SURFACE.inkOnDark.value)}>
                      {candidate
                        ? autoPreviewCandidate
                          ? `请检查左侧回填的角色和剧情大纲，点击「${persistLabel}」后才会写入项目。保存项目记忆不会填写表单。`
                          : '确认前不会修改原表单。'
                        : '格式暂时无法解析，可复制后手动填写或继续澄清。'}
                    </p>
                  </div>
                  {candidate ? (
                    <CandidatePreview value={candidate.value} />
                  ) : (
                    <pre
                      data-testid="creative-assistant-candidate-raw"
                      className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs text-slate-200"
                    >
                      {candidateRaw}
                    </pre>
                  )}
                  {candidate && (
                    <details className="text-xs text-slate-400">
                      <summary className="cursor-pointer select-none text-slate-300">
                        查看原文
                      </summary>
                      <pre
                        data-testid="creative-assistant-candidate-raw"
                        className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-[11px] text-slate-400"
                      >
                        {candidateRaw}
                      </pre>
                    </details>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void copyCandidate()}>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      复制
                    </Button>
                    {candidate &&
                      (autoPreviewCandidate && onPersist ? (
                        <Button size="sm" onClick={() => persistCandidate()}>
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          {persistLabel}
                        </Button>
                      ) : (
                        candidate && (
                          <Button size="sm" onClick={() => setConfirmOpen(true)}>
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            填充表单
                          </Button>
                        )
                      ))}
                  </div>
                </div>
              )}
              <div
                ref={transcriptEndRef}
                aria-hidden="true"
                data-testid="creative-assistant-transcript-end"
              />
            </div>
          </ScrollArea>
          <div className="space-y-3 border-t border-slate-800 p-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={generateCandidate} disabled={generating}>
                <WandSparkles className="mr-1.5 h-3.5 w-3.5" />
                生成可回填草稿
              </Button>
              {generating && (
                <Button variant="outline" size="sm" onClick={stopGeneration}>
                  <Square className="mr-1.5 h-3.5 w-3.5" />
                  停止
                </Button>
              )}
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="relative">
                    <img
                      src={attachment.dataUrl}
                      alt={attachment.name}
                      className="h-14 w-14 rounded border border-slate-700 object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-slate-800 p-0 text-slate-200 hover:bg-rose-500"
                      aria-label={`移除图片 ${attachment.name}`}
                      onClick={() =>
                        setAttachments((items) => items.filter((item) => item.id !== attachment.id))
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={uploadRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={(event) => void selectAttachments(event)}
            />
            <div className="rounded-xl border border-slate-200 bg-white focus-within:border-indigo-400">
              {selectedSkillIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-2 pt-2" aria-label="已选技能">
                  {selectedSkillIds.map((skillId) => {
                    const skill = assistantSkillRegistry.get(skillId);
                    if (!skill) return null;
                    return (
                      <span
                        key={skill.id}
                        className="inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-slate-100 pl-1.5 pr-0.5 text-xs text-slate-800 ring-1 ring-inset ring-slate-200"
                      >
                        <WandSparkles className="h-3 w-3 shrink-0 text-indigo-500" />
                        <span className="truncate">{skill.label}</span>
                        <button
                          type="button"
                          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                          aria-label={`移除技能 ${skill.label}`}
                          onClick={() =>
                            setSelectedSkillIds((ids) => ids.filter((id) => id !== skill.id))
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <label className="sr-only" htmlFor={`creative-assistant-${targetLabel}`}>
                AI 对话输入
              </label>
              <Textarea
                id={`creative-assistant-${targetLabel}`}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="输入创作要求，或附加图片供 AI 分析..."
                rows={3}
                disabled={generating}
                className="border-0 bg-transparent text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-0"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="添加图片"
                aria-label="添加图片"
                onClick={() => uploadRef.current?.click()}
                disabled={generating || attachments.length >= MAX_ATTACHMENTS}
              >
                <ImagePlus />
              </Button>
              <div className="relative" ref={skillMenuRef}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  aria-label="选择技能"
                  aria-expanded={skillMenuOpen}
                  aria-haspopup="menu"
                  disabled={generating}
                  onClick={() => setSkillMenuOpen((isOpen) => !isOpen)}
                >
                  技能
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
                {skillMenuOpen ? (
                  <div
                    role="menu"
                    aria-label="可选技能"
                    className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 py-1 text-slate-100 shadow-lg"
                  >
                    <p className="px-3 py-1.5 text-xs text-slate-400">本轮可多选</p>
                    {assistantSkillRegistry.userSelectable().map((skill) => {
                      const checked = selectedSkillIds.includes(
                        skill.id as CatalogAssistantSkillId
                      );
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          role="menuitemcheckbox"
                          aria-label={skill.label}
                          aria-checked={checked}
                          disabled={generating}
                          className="flex w-full items-center gap-2 bg-transparent px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50"
                          onClick={() => toggleSelectedSkill(skill.id as CatalogAssistantSkillId)}
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-500">
                            {checked ? <Check className="h-3 w-3 text-indigo-300" /> : null}
                          </span>
                          <span>
                            <span className="block">{skill.label}</span>
                            <span className="block text-xs text-slate-500">
                              {skill.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <Button
                className="flex-1"
                onClick={sendMessage}
                disabled={generating || (!input.trim() && attachments.length === 0)}
              >
                <Send className="mr-1.5 h-4 w-4" />
                发送消息
              </Button>
            </div>
          </div>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={`确认填充${targetLabel}？`}
            description="当前表单内容会被候选稿替换；填充后仍可在原表单继续编辑。"
            okText="确认填充"
            cancelText="取消"
            onOk={applyCandidate}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
