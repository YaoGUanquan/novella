import type { CreativeAssistantMemory, CreativeAssistantState } from './types';

export type AssistantInfoRow = {
  label: string;
  values: string[];
};

export const ASSISTANT_CHAT_LAYOUT = {
  stack: 'space-y-2.5',
  title: 'text-xs font-semibold tracking-wide',
  row: 'grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-3',
  stackedRow: 'space-y-1',
  label: 'text-[11px] leading-5',
  values: 'min-w-0 space-y-1.5',
  value: 'break-words text-sm leading-6',
} as const;

const COMPACT_VALUE_LENGTH = 24;
const LABELED_LINE = /^([^\n：:]{1,16})[：:]\s*(.+)$/;
const INFO_LABEL =
  /^(意图|目标|已确认|待确认|约束|术语|角色名称|姓名|角色定位|定位|性格|性格特征|外貌|外观|外观特征|背景|身份|年龄|性别|口头禅|关系|动机|人设|设定|项目名|项目名称|剧情大纲|大纲|简介|故事|服饰|发型|发色|瞳色|肤色|体型|身高|体重|特征)$/;

export function stripAssistantInlineMarkers(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}

export function isCompactInfoValue(value: string): boolean {
  return value.length <= COMPACT_VALUE_LENGTH && !value.includes('\n');
}

export function isInfoLabel(label: string): boolean {
  const cleaned = stripAssistantInlineMarkers(label);
  if (INFO_LABEL.test(cleaned)) return true;
  return /^(角色|已确认|待确认)/.test(cleaned) && cleaned.length <= 12;
}

export function splitInfoValues(value: string): string[] {
  return value
    .split(/[；;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseLabeledLine(line: string): AssistantInfoRow | null {
  const match = stripAssistantInlineMarkers(line).match(LABELED_LINE);
  if (!match) return null;
  const values = splitInfoValues(match[2]);
  if (values.length === 0) return null;
  return { label: match[1].trim(), values };
}

export function tryParseInfoRows(text: string): AssistantInfoRow[] | null {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => stripAssistantInlineMarkers(line))
    .filter(Boolean);
  if (lines.length === 0) return null;

  const rows: AssistantInfoRow[] = [];
  for (const line of lines) {
    const row = parseLabeledLine(line);
    if (!row || !isInfoLabel(row.label)) return null;
    rows.push(row);
  }
  return rows;
}

function glossaryValues(glossary: CreativeAssistantState['glossary']): string[] {
  return glossary.map((entry) => `${entry.term}：${entry.meaning}`);
}

export function rowsFromAssistantState(state: CreativeAssistantState): AssistantInfoRow[] {
  const rows: AssistantInfoRow[] = [];
  if (state.intent) rows.push({ label: '意图', values: [state.intent] });
  if (state.confirmedFacts.length > 0) {
    rows.push({ label: '已确认', values: state.confirmedFacts });
  }
  if (state.openQuestions.length > 0) {
    rows.push({ label: '待确认', values: state.openQuestions });
  }
  if (state.glossary.length > 0) {
    rows.push({ label: '术语', values: glossaryValues(state.glossary) });
  }
  return rows;
}

export function rowsFromMemorySummary(memory: CreativeAssistantMemory): AssistantInfoRow[] {
  const rows: AssistantInfoRow[] = [];
  if (memory.intent) rows.push({ label: '意图', values: [memory.intent] });
  if (memory.confirmedFacts.length > 0) {
    rows.push({ label: '已确认', values: memory.confirmedFacts.slice(0, 3) });
  }
  if (memory.constraints.length > 0) {
    rows.push({ label: '约束', values: memory.constraints.slice(0, 2) });
  }
  if (memory.glossary.length > 0) {
    rows.push({ label: '术语', values: glossaryValues(memory.glossary.slice(0, 2)) });
  }
  return rows;
}
