import {
  formatEnabledSkillsForPrompt,
  formatSelectedSkillsForPrompt,
  hideAssistantSkillMarker,
  parseAssistantSkillMarker,
  type AssistantSkill,
  type AssistantSkillId,
} from '@/core/services/ai/assistant-skills';

import type {
  CreativeAssistantGlossaryEntry,
  CreativeAssistantMemory,
  CreativeAssistantState,
} from './types';

const STORAGE_PREFIX = 'novella_creative_assistant_memory_v1:';
const STATE_TAG = /<novella-state\b[^>]*>([\s\S]*?)<\/novella-state\s*>/i;
const STATE_START_TAG = /<novella-state\b/i;
const STATE_OPEN_TAG = /^<novella-state\b[^>]*>/i;

const MAX_INTENT_LENGTH = 300;
const MAX_TARGET_LENGTH = 120;
const MAX_CONSTRAINT_LENGTH = 240;
const MAX_FACT_LENGTH = 500;
const MAX_QUESTION_LENGTH = 300;
const MAX_TERM_LENGTH = 80;
const MAX_MEANING_LENGTH = 300;

export interface ParsedCreativeAssistantResponse {
  content: string;
  state: CreativeAssistantState | null;
  skillId: AssistantSkillId | null;
}

export const EMPTY_CREATIVE_ASSISTANT_MEMORY: CreativeAssistantMemory = {
  version: 1,
  intent: '',
  target: '',
  constraints: [],
  confirmedFacts: [],
  openQuestions: [],
  glossary: [],
  updatedAt: '',
};

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function uniqueStrings(value: unknown, maxLength: number, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    const text = cleanText(item, maxLength);
    if (text && !result.includes(text)) result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

function normalizeGlossary(value: unknown): CreativeAssistantGlossaryEntry[] {
  if (!Array.isArray(value)) return [];
  const result: CreativeAssistantGlossaryEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Partial<CreativeAssistantGlossaryEntry>;
    const term = cleanText(entry.term, MAX_TERM_LENGTH);
    const meaning = cleanText(entry.meaning, MAX_MEANING_LENGTH);
    if (!term || !meaning || result.some((existing) => existing.term === term)) continue;
    result.push({ term, meaning });
    if (result.length >= 12) break;
  }
  return result;
}

export function normalizeCreativeAssistantState(value: unknown): CreativeAssistantState | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<CreativeAssistantState>;
  const state = {
    intent: cleanText(input.intent, MAX_INTENT_LENGTH),
    target: cleanText(input.target, MAX_TARGET_LENGTH),
    constraints: uniqueStrings(input.constraints, MAX_CONSTRAINT_LENGTH, 8),
    confirmedFacts: uniqueStrings(input.confirmedFacts, MAX_FACT_LENGTH, 8),
    openQuestions: uniqueStrings(input.openQuestions, MAX_QUESTION_LENGTH, 8),
    glossary: normalizeGlossary(input.glossary),
  };
  return state.intent ||
    state.target ||
    state.constraints.length ||
    state.confirmedFacts.length ||
    state.openQuestions.length ||
    state.glossary.length
    ? state
    : null;
}

export function normalizeCreativeAssistantMemory(value: unknown): CreativeAssistantMemory {
  const state = normalizeCreativeAssistantState(value) ?? {
    intent: '',
    target: '',
    constraints: [],
    confirmedFacts: [],
    openQuestions: [],
    glossary: [],
  };
  const updatedAt =
    value &&
    typeof value === 'object' &&
    typeof (value as { updatedAt?: unknown }).updatedAt === 'string'
      ? (value as { updatedAt: string }).updatedAt
      : '';
  return { version: 1, ...state, updatedAt };
}

export function loadCreativeAssistantMemory(projectId?: string): CreativeAssistantMemory {
  if (!projectId || typeof window === 'undefined') return { ...EMPTY_CREATIVE_ASSISTANT_MEMORY };
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    return normalizeCreativeAssistantMemory(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...EMPTY_CREATIVE_ASSISTANT_MEMORY };
  }
}

export function saveCreativeAssistantMemory(
  projectId: string | undefined,
  memory: CreativeAssistantMemory
): void {
  if (!projectId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      storageKey(projectId),
      JSON.stringify(normalizeCreativeAssistantMemory(memory))
    );
  } catch {
    // Memory is an enhancement; storage failures must not interrupt creation.
  }
}

export function clearCreativeAssistantMemory(projectId?: string): void {
  if (!projectId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(projectId));
  } catch {
    // Ignore unavailable storage so chat and form editing remain usable.
  }
}

export function mergeCreativeAssistantMemory(
  current: CreativeAssistantMemory,
  next: CreativeAssistantState
): CreativeAssistantMemory {
  const mergedGlossary = [...current.glossary];
  for (const entry of next.glossary) {
    const existing = mergedGlossary.findIndex((item) => item.term === entry.term);
    if (existing >= 0) mergedGlossary[existing] = entry;
    else mergedGlossary.push(entry);
  }
  return normalizeCreativeAssistantMemory({
    ...current,
    intent: next.intent || current.intent,
    target: next.target || current.target,
    constraints: [...current.constraints, ...next.constraints],
    confirmedFacts: [...current.confirmedFacts, ...next.confirmedFacts],
    // Open questions describe the current unresolved state, so the latest turn wins.
    openQuestions: next.openQuestions,
    glossary: mergedGlossary,
    updatedAt: new Date().toISOString(),
  });
}

export function isCreativeAssistantStateApplied(
  state: CreativeAssistantState | undefined,
  memory: CreativeAssistantMemory
): boolean {
  if (!state) return false;
  const checks = [
    ...(state.intent ? [memory.intent === state.intent] : []),
    ...(state.target ? [memory.target === state.target] : []),
    ...state.constraints.map((item) => memory.constraints.includes(item)),
    ...state.confirmedFacts.map((item) => memory.confirmedFacts.includes(item)),
    ...state.glossary.map((entry) =>
      memory.glossary.some((item) => item.term === entry.term && item.meaning === entry.meaning)
    ),
  ];
  return checks.length > 0 && checks.every(Boolean);
}

export function formatCreativeAssistantMemory(memory: CreativeAssistantMemory): string {
  const sections = [
    memory.intent && `当前意图：${memory.intent}`,
    memory.target && `当前目标：${memory.target}`,
    memory.constraints.length && `已确认约束：\n- ${memory.constraints.join('\n- ')}`,
    memory.confirmedFacts.length && `已确认事实：\n- ${memory.confirmedFacts.join('\n- ')}`,
    memory.openQuestions.length && `待确认问题：\n- ${memory.openQuestions.join('\n- ')}`,
    memory.glossary.length &&
      `项目术语：\n${memory.glossary.map((entry) => `- ${entry.term}：${entry.meaning}`).join('\n')}`,
  ].filter(Boolean);
  return sections.length > 0 ? sections.join('\n') : '暂无已确认项目记忆。';
}

export function buildCreativeAssistantSystemPrompt(options: {
  targetLabel: string;
  instruction: string;
  memory: CreativeAssistantMemory;
  includeStateContract?: boolean;
  enabledSkills?: AssistantSkill[];
  selectedSkillIds?: AssistantSkillId[];
}): string {
  const stateContract =
    options.includeStateContract === false
      ? ''
      : `\n\n在自然语言回复末尾追加机器状态标记（不要在正文中解释）：\n<novella-state>{"intent":"...","target":"...","constraints":["..."],"confirmedFacts":["仅用户明确确认的事实"],"openQuestions":["仍需用户确认的问题"],"glossary":[{"term":"项目术语","meaning":"含义"}]}</novella-state>\n状态规则：只记录用户已经明确说出或确认的内容；推测、建议和模型自行补全的内容必须留在正文或 openQuestions 中。最多返回 8 条事实、8 个问题和 12 个术语。`;
  const skillContract =
    options.includeStateContract === false
      ? ''
      : `${formatEnabledSkillsForPrompt(options.enabledSkills ?? [])}${formatSelectedSkillsForPrompt(options.selectedSkillIds ?? [], options.enabledSkills ?? [])}`;
  return `你是 Novella 的专业漫剧创作助手，正在协助完善“${options.targetLabel}”。\n\n创作需求澄清规则：\n1. 先理解用户想达成的结果，再提出最少且最关键的澄清问题。\n2. 将用户明确确认的内容与模型建议严格区分，不要把猜测当成既定设定。\n3. 结合项目上下文和已确认项目记忆，保持角色、世界观、视觉风格和叙事约束的一致。\n4. 普通对话只讨论和澄清，不声称已经修改或回填表单。\n5. 只有用户明确要求生成草稿时，才按调用方提供的格式输出。\n\n本轮任务：${options.instruction}${stateContract}${skillContract}`;
}

export function hideCreativeAssistantStateMarker(content: string): string {
  const withoutSkills = hideAssistantSkillMarker(content);
  const start = withoutSkills.search(STATE_START_TAG);
  return start >= 0 ? withoutSkills.slice(0, start).trimEnd() : withoutSkills;
}

function tryParseStatePayload(payload: string): CreativeAssistantState | null {
  try {
    return normalizeCreativeAssistantState(JSON.parse(payload));
  } catch {
    return null;
  }
}

function extractCreativeAssistantStatePayload(raw: string): {
  content: string;
  payload: string | null;
} {
  const closed = raw.match(STATE_TAG);
  if (closed?.index !== undefined) {
    return {
      content: `${raw.slice(0, closed.index)}${raw.slice(closed.index + closed[0].length)}`.trim(),
      payload: closed[1],
    };
  }

  const start = raw.search(STATE_START_TAG);
  if (start < 0) {
    return { content: raw.trim(), payload: null };
  }

  return {
    content: raw.slice(0, start).trim(),
    payload: raw
      .slice(start)
      .replace(STATE_OPEN_TAG, '')
      .replace(/<\/novella-state\s*>/gi, '')
      .trim(),
  };
}

export function parseCreativeAssistantResponse(raw: string): ParsedCreativeAssistantResponse {
  const extracted = extractCreativeAssistantStatePayload(raw);
  const parsedSkill = parseAssistantSkillMarker(extracted.content);
  return {
    content: parsedSkill.content,
    state: extracted.payload ? tryParseStatePayload(extracted.payload) : null,
    skillId: parsedSkill.skillId,
  };
}
