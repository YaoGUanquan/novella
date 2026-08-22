export type DialogueStreamEventKind = 'text' | 'thinking';

export interface DialogueStreamEvent {
  kind: DialogueStreamEventKind;
  text: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function nonEmptyText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function parseOpenAIStreamDelta(value: unknown): DialogueStreamEvent[] {
  const root = asRecord(value);
  const firstChoice = Array.isArray(root?.choices) ? asRecord(root.choices[0]) : null;
  const delta = asRecord(firstChoice?.delta) ?? asRecord(root?.delta);
  if (!delta) return [];

  const events: DialogueStreamEvent[] = [];
  const thinking = nonEmptyText(delta.reasoning_content) ?? nonEmptyText(delta.reasoning);
  const text = nonEmptyText(delta.content);
  if (thinking) events.push({ kind: 'thinking', text: thinking });
  if (text) events.push({ kind: 'text', text });
  return events;
}

export function parseAnthropicStreamEvent(value: unknown): DialogueStreamEvent[] {
  const event = asRecord(value);
  if (!event) return [];
  const delta = asRecord(event.delta);
  if (event.type !== 'content_block_delta' || !delta) return [];

  if (delta.type === 'thinking_delta') {
    const thinking = nonEmptyText(delta.thinking) ?? nonEmptyText(delta.text);
    return thinking ? [{ kind: 'thinking', text: thinking }] : [];
  }
  if (delta.type === 'text_delta') {
    const text = nonEmptyText(delta.text);
    return text ? [{ kind: 'text', text }] : [];
  }
  return [];
}

export async function* textChunksFromEvents(
  events: AsyncIterable<DialogueStreamEvent>
): AsyncGenerator<string> {
  for await (const event of events) {
    if (event.kind === 'text' && event.text) yield event.text;
  }
}

export async function* textEventsFromStringStream(
  chunks: AsyncIterable<string>
): AsyncGenerator<DialogueStreamEvent> {
  for await (const text of chunks) {
    if (text) yield { kind: 'text', text };
  }
}
