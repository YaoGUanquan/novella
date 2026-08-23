import type { AssistantSkill, CatalogAssistantSkillId, ProductAssistantSkillId } from './types';

export const AE_ASSISTANT_SOURCE_REPO = 'https://github.com/YaoGUanquan/codex-ai-agent-engine';

export const PRODUCT_ASSISTANT_SKILLS: AssistantSkill[] = [
  {
    id: 'clarify-requirements',
    label: '澄清需求',
    description: '加强本轮需求访谈，不修改表单或记忆。',
    sideEffect: 'none',
    visibility: 'always-on',
    instruction: '先理解用户目标，再提出最少且最关键的澄清问题。不要把猜测写成已确认设定。',
  },
  {
    id: 'propose-candidate',
    label: '生成草稿',
    description: '生成可回填候选稿，确认后才写入表单。',
    sideEffect: 'candidate-proposal',
    visibility: 'always-on',
    instruction:
      '仅在用户明确要求生成草稿、补全当前表单，或当前目标是角色设定且已确认主角姓名时调用。按调用方格式输出完整候选稿：角色须含外观与服饰；项目正文为空或用户要大纲时，必须同时根据角色生成 outline。不要声称已经回填或保存表单。',
  },
  {
    id: 'propose-memory',
    label: '记忆提案',
    description: '整理本轮可保存记忆，确认后才写入项目记忆。',
    sideEffect: 'memory-proposal',
    visibility: 'always-on',
    instruction: '用状态标记整理用户已确认的事实与待确认问题。不要在用户保存前声称已经记住。',
  },
];

export const AE_ASSISTANT_SKILLS: AssistantSkill[] = [
  {
    id: 'ae-ideate',
    label: '想法发散',
    description: '给出若干可执行的创作方向，并标明取舍。',
    sideEffect: 'none',
    visibility: 'user-selectable',
    sourceSkill: 'ae-ideate',
    sourceRepo: AE_ASSISTANT_SOURCE_REPO,
    instruction:
      '先列出 3-5 个实质不同的创作方向，而不是同义改写。每个方向写清价值、代价、风险和何时放弃。推测必须标明为推测。若本轮只点选了本技能，最后只推荐一个最小下一步；若同时点选了其他可见技能，不要单独写「最小下一步推荐」，把决策留给文末「本轮结论」。不要直接回填表单。',
  },
  {
    id: 'ae-doc-structure',
    label: '结构化整理',
    description: '把散乱设定整理成可检查的结构。',
    sideEffect: 'none',
    visibility: 'user-selectable',
    sourceSkill: 'ae-doc-structure',
    sourceRepo: AE_ASSISTANT_SOURCE_REPO,
    instruction:
      '把当前对话和项目上下文整理成结构：已确认事实、约束、开放问题、建议条目。不确定的内容只放开放问题。不要发明未出现的设定，也不要回填表单。',
  },
  {
    id: 'ae-doc-humanize',
    label: '文案润色',
    description: '在不改变事实的前提下让文案更可读。',
    sideEffect: 'none',
    visibility: 'user-selectable',
    sourceSkill: 'ae-doc-humanize',
    sourceRepo: AE_ASSISTANT_SOURCE_REPO,
    instruction:
      '润色用户已给出或已确认的文案，使其更顺口、更适合漫剧对白或设定说明。不得新增事实、人物关系或世界观细节。若材料不足，先指出缺什么。',
  },
  {
    id: 'ae-imagegen-prompt',
    label: '画面提示词',
    description: '把视觉需求写成可控的画面提示词。',
    sideEffect: 'none',
    visibility: 'user-selectable',
    sourceSkill: 'ae-imagegen-prompt',
    sourceRepo: AE_ASSISTANT_SOURCE_REPO,
    instruction:
      '把当前视觉需求整理成画面提示词：主体、构图、风格、画幅、避免项。保留用户意图，不擅自加入品牌或无关元素。只输出提示词规格，不要声称已经生成图片。',
  },
  {
    id: 'ae-review',
    label: '质量审查',
    description: '对照已确认设定检查漏洞与不一致。',
    sideEffect: 'none',
    visibility: 'user-selectable',
    sourceSkill: 'ae-review',
    sourceRepo: AE_ASSISTANT_SOURCE_REPO,
    instruction:
      '以审查口吻检查当前设定/草稿：不一致、缺失、风险和建议。发现优先于夸奖。不要把推测写成已确认事实，不要回填表单或保存记忆。',
  },
];

export const BUILTIN_ASSISTANT_SKILLS: AssistantSkill[] = [
  ...PRODUCT_ASSISTANT_SKILLS,
  ...AE_ASSISTANT_SKILLS,
];

export const PRODUCT_ASSISTANT_SKILL_IDS: ProductAssistantSkillId[] = PRODUCT_ASSISTANT_SKILLS.map(
  (skill) => skill.id as ProductAssistantSkillId
);

export const AE_ASSISTANT_SKILL_IDS: CatalogAssistantSkillId[] = AE_ASSISTANT_SKILLS.map(
  (skill) => skill.id as CatalogAssistantSkillId
);

export const ASSISTANT_SKILL_IDS: Array<AssistantSkill['id']> = BUILTIN_ASSISTANT_SKILLS.map(
  (skill) => skill.id
);

export function isAssistantSkillId(value: string): value is AssistantSkill['id'] {
  return ASSISTANT_SKILL_IDS.includes(value as AssistantSkill['id']);
}

export function isCatalogAssistantSkillId(value: string): value is CatalogAssistantSkillId {
  return AE_ASSISTANT_SKILL_IDS.includes(value as CatalogAssistantSkillId);
}
