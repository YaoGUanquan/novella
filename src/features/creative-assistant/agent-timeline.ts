import type { CreativeAssistantAgentStep, CreativeAssistantAgentStepStatus } from './types';

export const AGENT_STEP_IDS = {
  start: 'start',
  skills: 'skills',
  model: 'model',
  assemble: 'assemble',
} as const;

export function createAgentTimeline(skillLabels: string[]): CreativeAssistantAgentStep[] {
  return [
    { id: AGENT_STEP_IDS.start, label: '开始处理本轮请求', status: 'done' },
    ...(skillLabels.length > 0
      ? [
          {
            id: AGENT_STEP_IDS.skills,
            label: `应用技能：${skillLabels.join('、')}`,
            status: 'done' as const,
          },
        ]
      : []),
    { id: AGENT_STEP_IDS.model, label: '请求对话模型', status: 'running' },
  ];
}

export function completeAgentStep(
  steps: CreativeAssistantAgentStep[],
  id: string
): CreativeAssistantAgentStep[] {
  return steps.map((step) =>
    step.id === id && step.status === 'running' ? { ...step, status: 'done' } : step
  );
}

export function appendAgentStep(
  steps: CreativeAssistantAgentStep[],
  next: CreativeAssistantAgentStep
): CreativeAssistantAgentStep[] {
  if (steps.some((step) => step.id === next.id)) {
    return steps.map((step) => (step.id === next.id ? { ...step, ...next } : step));
  }
  return [...steps, next];
}

export function failRunningAgentSteps(
  steps: CreativeAssistantAgentStep[]
): CreativeAssistantAgentStep[] {
  return steps.map((step) => (step.status === 'running' ? { ...step, status: 'failed' } : step));
}

export function finishAgentTimeline(
  steps: CreativeAssistantAgentStep[]
): CreativeAssistantAgentStep[] {
  return appendAgentStep(completeAgentStep(steps, AGENT_STEP_IDS.model), {
    id: AGENT_STEP_IDS.assemble,
    label: '整理回复',
    status: 'done',
  }).map((step) => (step.status === 'running' ? { ...step, status: 'done' } : step));
}

export function agentStepStatusLabel(status: CreativeAssistantAgentStepStatus): string {
  switch (status) {
    case 'running':
      return '进行中';
    case 'done':
      return '完成';
    case 'failed':
      return '失败';
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function parseStoredAgentSteps(value: unknown): CreativeAssistantAgentStep[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const steps: CreativeAssistantAgentStep[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Partial<CreativeAssistantAgentStep>;
    if (typeof record.id !== 'string' || typeof record.label !== 'string') continue;
    if (record.status !== 'running' && record.status !== 'done' && record.status !== 'failed')
      continue;
    steps.push({
      id: record.id,
      label: record.label,
      status: record.status === 'running' ? 'failed' : record.status,
    });
  }
  return steps.length > 0 ? steps : undefined;
}
