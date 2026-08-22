export type AssistantMarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string }
  | { type: 'paragraph'; text: string };

const HEADING = /^(#{1,3})\s+(.+)$/;
const UNORDERED = /^[-*]\s+(.+)$/;
const ORDERED = /^(\d+)\.\s+(.+)$/;
const QUOTE = /^>\s?(.*)$/;
const FENCE = /^```/;
const BOLD_ONLY = /^\*\*(.+)\*\*$/;

function pushParagraph(blocks: AssistantMarkdownBlock[], lines: string[]) {
  const text = lines.join('\n').trim();
  if (!text) return;
  const boldOnly = text.match(BOLD_ONLY);
  if (boldOnly) {
    blocks.push({ type: 'heading', level: 3, text: boldOnly[1] });
    return;
  }
  blocks.push({ type: 'paragraph', text });
}

export function parseAssistantMarkdown(content: string): AssistantMarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: AssistantMarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (FENCE.test(line.trim())) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !FENCE.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const marks = heading[1].length;
      const level: 1 | 2 | 3 = marks === 1 ? 1 : marks === 2 ? 2 : 3;
      blocks.push({ type: 'heading', level, text: heading[2].trim() });
      index += 1;
      continue;
    }

    const unordered = line.match(UNORDERED);
    if (unordered) {
      const items: string[] = [unordered[1]];
      index += 1;
      while (index < lines.length) {
        const next = lines[index].match(UNORDERED);
        if (!next) break;
        items.push(next[1]);
        index += 1;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    const ordered = line.match(ORDERED);
    if (ordered) {
      const items: string[] = [ordered[2]];
      index += 1;
      while (index < lines.length) {
        const next = lines[index].match(ORDERED);
        if (!next) break;
        items.push(next[2]);
        index += 1;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    const quote = line.match(QUOTE);
    if (quote) {
      const quoted: string[] = [quote[1]];
      index += 1;
      while (index < lines.length) {
        const next = lines[index].match(QUOTE);
        if (!next) break;
        quoted.push(next[1]);
        index += 1;
      }
      blocks.push({ type: 'quote', text: quoted.join('\n') });
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length) {
      const next = lines[index];
      if (!next.trim()) break;
      if (
        HEADING.test(next) ||
        UNORDERED.test(next) ||
        ORDERED.test(next) ||
        QUOTE.test(next) ||
        FENCE.test(next.trim())
      ) {
        break;
      }
      paragraph.push(next);
      index += 1;
    }
    pushParagraph(blocks, paragraph);
  }

  return blocks;
}

export type AssistantMarkdownInlinePart =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'em'; value: string }
  | { type: 'code'; value: string };

export function parseAssistantMarkdownInline(text: string): AssistantMarkdownInlinePart[] {
  const parts: AssistantMarkdownInlinePart[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let lastIndex = 0;
  let match = pattern.exec(text);
  while (match) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) parts.push({ type: 'strong', value: match[1] });
    else if (match[2] !== undefined) parts.push({ type: 'em', value: match[2] });
    else parts.push({ type: 'code', value: match[3] });
    lastIndex = match.index + match[0].length;
    match = pattern.exec(text);
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return parts.length > 0 ? parts : [{ type: 'text', value: text }];
}
