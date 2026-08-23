import React from 'react';

import { ASSISTANT_CHAT_SURFACE } from '../assistant-chat-surface';
import { tryParseInfoRows } from '../assistant-info-layout';
import {
  parseAssistantMarkdown,
  parseAssistantMarkdownInline,
  type AssistantMarkdownBlock,
  type AssistantMarkdownInlinePart,
} from '../assistant-markdown';

import { AssistantInfoCard } from './AssistantInfoCard';

function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseAssistantMarkdownInline(text).map((part, index) => (
        <InlinePart key={`${part.type}-${index}`} part={part} />
      ))}
    </>
  );
}

function InlinePart({ part }: { part: AssistantMarkdownInlinePart }) {
  switch (part.type) {
    case 'text':
      return <>{part.value}</>;
    case 'strong':
      return <strong className="font-semibold">{part.value}</strong>;
    case 'em':
      return <em className="italic text-slate-100">{part.value}</em>;
    case 'code':
      return (
        <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[11px] text-indigo-100">
          {part.value}
        </code>
      );
    default: {
      const exhaustive: never = part;
      return exhaustive;
    }
  }
}

function headingClass(level: 1 | 2 | 3): string {
  switch (level) {
    case 1:
      return 'text-sm font-semibold tracking-wide text-indigo-100';
    case 2:
      return 'text-sm font-semibold text-indigo-100';
    case 3:
      return 'text-sm font-semibold text-indigo-200';
    default: {
      const exhaustive: never = level;
      return exhaustive;
    }
  }
}

function MarkdownBlock({ block, index }: { block: AssistantMarkdownBlock; index: number }) {
  switch (block.type) {
    case 'heading': {
      const Tag = block.level === 1 ? 'h3' : 'h4';
      return (
        <Tag className={headingClass(block.level)}>
          <InlineText text={block.text} />
        </Tag>
      );
    }
    case 'list': {
      const infoRows = tryParseInfoRows(block.items.join('\n'));
      if (infoRows) {
        return <AssistantInfoCard rows={infoRows} />;
      }
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag
          className={block.ordered ? 'list-decimal space-y-1.5 pl-5' : 'list-disc space-y-1.5 pl-5'}
        >
          {block.items.map((item, itemIndex) => (
            <li key={`${index}-${itemIndex}`} className="break-words leading-6">
              <InlineText text={item} />
            </li>
          ))}
        </ListTag>
      );
    }
    case 'quote':
      return (
        <blockquote className="border-l-2 border-indigo-400/70 pl-3 text-slate-300">
          <p className="whitespace-pre-wrap break-words leading-6">
            <InlineText text={block.text} />
          </p>
        </blockquote>
      );
    case 'code':
      return (
        <pre className="overflow-x-auto rounded-md bg-slate-950 p-2 font-mono text-[11px] leading-5 text-slate-300">
          <code>{block.text}</code>
        </pre>
      );
    case 'paragraph': {
      const infoRows = tryParseInfoRows(block.text);
      if (infoRows) {
        return <AssistantInfoCard rows={infoRows} />;
      }
      return (
        <p className="whitespace-pre-wrap break-words leading-6">
          <InlineText text={block.text} />
        </p>
      );
    }
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

export function AssistantMarkdown({ content }: { content: string }) {
  const blocks = parseAssistantMarkdown(content);
  if (blocks.length === 0) return null;
  return (
    <div data-testid="creative-assistant-markdown" className={ASSISTANT_CHAT_SURFACE.markdown}>
      {blocks.map((block, index) => (
        <MarkdownBlock key={`${block.type}-${index}`} block={block} index={index} />
      ))}
    </div>
  );
}
