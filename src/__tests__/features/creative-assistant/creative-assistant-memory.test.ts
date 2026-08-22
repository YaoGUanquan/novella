import {
  buildCreativeAssistantSystemPrompt,
  formatCreativeAssistantMemory,
  isCreativeAssistantStateApplied,
  mergeCreativeAssistantMemory,
  normalizeCreativeAssistantState,
  parseCreativeAssistantResponse,
  EMPTY_CREATIVE_ASSISTANT_MEMORY,
} from '@/features/creative-assistant/creative-assistant-memory';

describe('creative assistant memory contract', () => {
  it('parses and removes the machine state marker from visible content', () => {
    const result = parseCreativeAssistantResponse(
      [
        '我理解你希望突出角色的孤独感。',
        '<novella-state>{"intent":"完善角色","target":"角色设定","constraints":["保留枪杀前世"],"confirmedFacts":["李先是抱丹宗师"],"openQuestions":["转生后的年龄"],"glossary":[{"term":"抱丹","meaning":"武学境界"}]}</novella-state>',
      ].join('\n')
    );

    expect(result.content).toBe('我理解你希望突出角色的孤独感。');
    expect(result.skillId).toBeNull();
    expect(result.state).toEqual({
      intent: '完善角色',
      target: '角色设定',
      constraints: ['保留枪杀前世'],
      confirmedFacts: ['李先是抱丹宗师'],
      openQuestions: ['转生后的年龄'],
      glossary: [{ term: '抱丹', meaning: '武学境界' }],
    });
  });

  it('hides an unclosed state marker and still parses trailing JSON', () => {
    const result = parseCreativeAssistantResponse(
      [
        '我理解当前目标。',
        '',
        '为了避免歧义，我需要确认主角姓名。',
        '<novella-state>{"intent":"完善角色","target":"角色设定","constraints":[],"confirmedFacts":["项目名称是股海浮沉"],"openQuestions":["主角姓名"],"glossary":[]}',
      ].join('\n')
    );

    expect(result.content).toBe('我理解当前目标。\n\n为了避免歧义，我需要确认主角姓名。');
    expect(result.content).not.toContain('novella-state');
    expect(result.state?.confirmedFacts).toEqual(['项目名称是股海浮沉']);
  });

  it('preserves paragraph breaks in visible assistant content', () => {
    const result = parseCreativeAssistantResponse('第一段。\n\n第二段。\n第三行。');
    expect(result.content).toBe('第一段。\n\n第二段。\n第三行。');
  });

  it('normalizes untrusted state values and limits collection sizes', () => {
    const state = normalizeCreativeAssistantState({
      intent: '  角色  ',
      constraints: ['保留设定', '保留设定', 42],
      confirmedFacts: Array.from({ length: 20 }, (_, index) => `事实 ${index}`),
      glossary: [
        { term: '术语', meaning: '含义' },
        { term: '术语', meaning: '重复' },
      ],
    });

    expect(state?.intent).toBe('角色');
    expect(state?.constraints).toEqual(['保留设定']);
    expect(state?.confirmedFacts).toHaveLength(8);
    expect(state?.glossary).toEqual([{ term: '术语', meaning: '含义' }]);
  });

  it('merges only after an explicit memory save action', () => {
    const memory = mergeCreativeAssistantMemory(EMPTY_CREATIVE_ASSISTANT_MEMORY, {
      intent: '完善分镜',
      target: '分镜草稿',
      constraints: ['16:9'],
      confirmedFacts: ['场景发生在雨夜'],
      openQuestions: ['镜头时长'],
      glossary: [],
    });

    expect(
      isCreativeAssistantStateApplied(
        {
          intent: '完善分镜',
          target: '分镜草稿',
          constraints: ['16:9'],
          confirmedFacts: ['场景发生在雨夜'],
          openQuestions: ['镜头时长'],
          glossary: [],
        },
        memory
      )
    ).toBe(true);
    expect(formatCreativeAssistantMemory(memory)).toContain('场景发生在雨夜');
    expect(memory.openQuestions).toEqual(['镜头时长']);
    expect(memory.updatedAt).toEqual(expect.any(String));
  });

  it('uses the state contract for dialogue but disables it for candidate output', () => {
    const options = {
      targetLabel: '角色设定',
      instruction: '先澄清需求',
      memory: EMPTY_CREATIVE_ASSISTANT_MEMORY,
    };
    expect(buildCreativeAssistantSystemPrompt(options)).toContain('<novella-state>');
    expect(
      buildCreativeAssistantSystemPrompt({ ...options, includeStateContract: false })
    ).not.toContain('<novella-state>');
  });

  it('injects only enabled skills into the dialogue contract and strips skill markers', () => {
    const prompt = buildCreativeAssistantSystemPrompt({
      targetLabel: '角色设定',
      instruction: '先澄清需求',
      memory: EMPTY_CREATIVE_ASSISTANT_MEMORY,
      enabledSkills: [
        {
          id: 'clarify-requirements',
          label: '澄清需求',
          description: '加强访谈',
          sideEffect: 'none',
          visibility: 'always-on',
          instruction: '先澄清。',
        },
      ],
      selectedSkillIds: ['clarify-requirements'],
    });
    expect(prompt).toContain('clarify-requirements');
    expect(prompt).not.toContain('propose-candidate');
    expect(
      buildCreativeAssistantSystemPrompt({
        targetLabel: '角色设定',
        instruction: '生成草稿',
        memory: EMPTY_CREATIVE_ASSISTANT_MEMORY,
        includeStateContract: false,
        enabledSkills: [
          {
            id: 'propose-candidate',
            label: '生成草稿',
            description: '生成候选稿',
            sideEffect: 'candidate-proposal',
            visibility: 'always-on',
            instruction: '只在明确要求时给草稿。',
          },
        ],
      })
    ).not.toContain('novella-skill');

    const parsed = parseCreativeAssistantResponse(
      '建议先确认动机。<novella-skill id="propose-candidate"></novella-skill>'
    );
    expect(parsed.content).toBe('建议先确认动机。');
    expect(parsed.skillId).toBe('propose-candidate');
  });

  it('injects selected AE catalog instructions without copying external skill files', () => {
    const prompt = buildCreativeAssistantSystemPrompt({
      targetLabel: '角色设定',
      instruction: '先澄清需求',
      memory: EMPTY_CREATIVE_ASSISTANT_MEMORY,
      enabledSkills: [
        {
          id: 'ae-ideate',
          label: '想法发散',
          description: '给出方向',
          sideEffect: 'none',
          visibility: 'user-selectable',
          sourceSkill: 'ae-ideate',
          sourceRepo: 'https://github.com/YaoGUanquan/codex-ai-agent-engine',
          instruction: '列出实质不同的创作方向。',
        },
      ],
      selectedSkillIds: ['ae-ideate'],
    });
    expect(prompt).toContain('ae-ideate');
    expect(prompt).toContain('列出实质不同的创作方向。');
    expect(prompt).not.toContain('SKILL.md');
  });

  it('adds a single closer contract when two catalog skills are selected', () => {
    const ideate = {
      id: 'ae-ideate' as const,
      label: '想法发散',
      description: '给出方向',
      sideEffect: 'none' as const,
      visibility: 'user-selectable' as const,
      instruction: '列出实质不同的创作方向。',
    };
    const humanize = {
      id: 'ae-doc-humanize' as const,
      label: '文案润色',
      description: '润色文案',
      sideEffect: 'none' as const,
      visibility: 'user-selectable' as const,
      instruction: '润色已确认文案。',
    };
    const multi = buildCreativeAssistantSystemPrompt({
      targetLabel: '角色设定',
      instruction: '先澄清需求',
      memory: EMPTY_CREATIVE_ASSISTANT_MEMORY,
      enabledSkills: [ideate, humanize],
      selectedSkillIds: ['ae-ideate', 'ae-doc-humanize'],
    });
    expect(multi).toContain('本轮结论');
    expect(multi).toContain('多个可见技能');
    expect(multi).toContain('列出实质不同的创作方向。');
    expect(multi).toContain('润色已确认文案。');

    const single = buildCreativeAssistantSystemPrompt({
      targetLabel: '角色设定',
      instruction: '先澄清需求',
      memory: EMPTY_CREATIVE_ASSISTANT_MEMORY,
      enabledSkills: [ideate],
      selectedSkillIds: ['ae-ideate'],
    });
    expect(single).not.toContain('多个可见技能');
  });
});
