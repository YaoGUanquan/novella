import { Check, ChevronRight, Loader2, Sparkles, X } from 'lucide-react';
import React, { useEffect, useId, useState } from 'react';

import { cn } from '@/shared/utils/class-names';

import { agentStepStatusLabel } from '../agent-timeline';
import type { CreativeAssistantAgentStep, CreativeAssistantAgentStepStatus } from '../types';

export interface AgentThinkingTraceProps {
  steps: CreativeAssistantAgentStep[];
  live?: boolean;
}

function StepStatusIcon({ status }: { status: CreativeAssistantAgentStepStatus }) {
  switch (status) {
    case 'running':
      return (
        <Loader2
          className="h-3 w-3 animate-spin text-indigo-300 motion-reduce:animate-none"
          aria-hidden="true"
        />
      );
    case 'done':
      return <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />;
    case 'failed':
      return <X className="h-3 w-3 text-rose-400" aria-hidden="true" />;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function AgentThinkingTrace({ steps, live = false }: AgentThinkingTraceProps) {
  const listId = useId();
  const [expanded, setExpanded] = useState(live);
  const running = steps.some((step) => step.status === 'running');
  const failed = steps.some((step) => step.status === 'failed');
  const active = live || running;
  const title = active ? '正在思考' : '思考过程';

  useEffect(() => {
    setExpanded(live);
  }, [live]);

  if (steps.length === 0) return null;

  return (
    <div
      className="mb-3 overflow-hidden rounded-lg border border-indigo-400/40 bg-slate-800"
      data-testid="creative-assistant-thinking-trace"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs text-indigo-50 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-label={`${title}，共 ${steps.length} 步`}
        onClick={() => setExpanded((value) => !value)}
      >
        {active ? (
          <Loader2
            className="h-3.5 w-3.5 shrink-0 animate-spin text-indigo-300 motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : failed ? (
          <X className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden="true" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-300" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1 font-medium tracking-wide">{title}</span>
        <span className="shrink-0 text-[10px] tabular-nums text-slate-500">{steps.length} 步</span>
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-150 motion-reduce:transition-none',
            expanded && 'rotate-90'
          )}
          aria-hidden="true"
        />
      </button>
      <ol
        id={listId}
        data-testid="creative-assistant-agent-steps"
        hidden={!expanded}
        className="relative ml-4 border-l border-slate-700 pb-2.5 pl-4 pr-2"
      >
        {steps.map((step) => (
          <li key={step.id} className="relative py-1 text-xs leading-5 text-slate-100">
            <span className="absolute -left-[22px] top-1.5 flex h-3.5 w-3.5 items-center justify-center bg-slate-800">
              <StepStatusIcon status={step.status} />
            </span>
            <span className="sr-only">{agentStepStatusLabel(step.status)}：</span>
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
