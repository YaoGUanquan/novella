import React from 'react';

import { cn } from '@/shared/utils/class-names';

import { ASSISTANT_CHAT_SURFACE } from '../assistant-chat-surface';
import {
  ASSISTANT_CHAT_LAYOUT,
  isCompactInfoValue,
  type AssistantInfoRow,
} from '../assistant-info-layout';

export type AssistantInfoTone = 'notice' | 'panel' | 'embedded';

function inkForTone(tone: AssistantInfoTone) {
  return tone === 'notice' ? ASSISTANT_CHAT_SURFACE.inkOnLight : ASSISTANT_CHAT_SURFACE.inkOnDark;
}

function InfoRow({ row, tone }: { row: AssistantInfoRow; tone: AssistantInfoTone }) {
  const ink = inkForTone(tone);
  const compact = row.values.length === 1 && isCompactInfoValue(row.values[0]);

  if (compact) {
    return (
      <div className={ASSISTANT_CHAT_LAYOUT.row} data-testid="creative-assistant-info-row">
        <dt className={ink.label}>{row.label}</dt>
        <dd className={cn(ink.value, 'min-w-0')}>{row.values[0]}</dd>
      </div>
    );
  }

  return (
    <div className={ASSISTANT_CHAT_LAYOUT.stackedRow} data-testid="creative-assistant-info-row">
      <dt className={ink.label}>{row.label}</dt>
      <dd className={ASSISTANT_CHAT_LAYOUT.values}>
        {row.values.length === 1 ? (
          <p className={cn(ink.value, 'whitespace-pre-wrap')}>{row.values[0]}</p>
        ) : (
          <ul className="list-disc space-y-1.5 pl-4">
            {row.values.map((value, index) => (
              <li key={`${row.label}-${index}`} className={cn(ink.value, 'whitespace-pre-wrap')}>
                {value}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

function surfaceForTone(tone: AssistantInfoTone): string | undefined {
  switch (tone) {
    case 'notice':
      return ASSISTANT_CHAT_SURFACE.notice;
    case 'panel':
      return ASSISTANT_CHAT_SURFACE.memory;
    case 'embedded':
      return undefined;
    default: {
      const exhaustive: never = tone;
      return exhaustive;
    }
  }
}

export function AssistantInfoCard({
  title,
  rows,
  tone = 'embedded',
  footer,
  className,
}: {
  title?: string;
  rows: AssistantInfoRow[];
  tone?: AssistantInfoTone;
  footer?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && !title && !footer) return null;
  const ink = inkForTone(tone);

  return (
    <div
      data-testid="creative-assistant-info-card"
      className={cn(ASSISTANT_CHAT_LAYOUT.stack, surfaceForTone(tone), className)}
    >
      {title ? <p className={ink.title}>{title}</p> : null}
      {rows.length > 0 ? (
        <dl className="space-y-2">
          {rows.map((row, index) => (
            <InfoRow key={`${row.label}-${index}`} row={row} tone={tone} />
          ))}
        </dl>
      ) : null}
      {footer}
    </div>
  );
}
