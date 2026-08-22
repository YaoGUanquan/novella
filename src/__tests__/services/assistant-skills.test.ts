import {
  AE_ASSISTANT_SKILL_IDS,
  AE_ASSISTANT_SKILLS,
  AE_ASSISTANT_SOURCE_REPO,
  AssistantSkillRegistry,
  MULTI_SKILL_CLOSER_CONTRACT,
  PRODUCT_ASSISTANT_SKILL_IDS,
  assistantSkillRegistry,
  formatSelectedSkillsForPrompt,
  hideAssistantSkillMarker,
  parseAssistantSkillMarker,
} from '@/core/services/ai/assistant-skills';

describe('assistant skill registry', () => {
  it('keeps product skills always-on and AE adapters user-selectable', () => {
    expect(assistantSkillRegistry.alwaysOn().map((skill) => skill.id)).toEqual(
      PRODUCT_ASSISTANT_SKILL_IDS
    );
    expect(assistantSkillRegistry.userSelectable().map((skill) => skill.id)).toEqual(
      AE_ASSISTANT_SKILL_IDS
    );
    expect(
      AE_ASSISTANT_SKILLS.every(
        (skill) =>
          skill.sourceSkill &&
          skill.sourceRepo === AE_ASSISTANT_SOURCE_REPO &&
          skill.sideEffect === 'none'
      )
    ).toBe(true);
  });

  it('rejects unknown, disabled catalog, and accepts always-on product skills', () => {
    expect(assistantSkillRegistry.resolve('unknown-tool', PRODUCT_ASSISTANT_SKILL_IDS)).toEqual({
      id: 'unknown-tool',
      status: 'rejected',
      reason: '未知技能',
    });
    expect(assistantSkillRegistry.resolve('ae-ideate', PRODUCT_ASSISTANT_SKILL_IDS)).toEqual({
      id: 'ae-ideate',
      status: 'rejected',
      reason: '技能已禁用',
    });
    expect(
      assistantSkillRegistry.resolve('clarify-requirements', PRODUCT_ASSISTANT_SKILL_IDS)
    ).toEqual({
      id: 'clarify-requirements',
      status: 'accepted',
    });
    expect(
      assistantSkillRegistry.resolve('ae-ideate', [...PRODUCT_ASSISTANT_SKILL_IDS, 'ae-ideate'])
    ).toEqual({
      id: 'ae-ideate',
      status: 'accepted',
    });
  });

  it('can unregister a skill so ordinary dialogue remains possible', () => {
    const registry = new AssistantSkillRegistry();
    expect(registry.unregister('propose-memory')).toBe(true);
    expect(registry.get('propose-memory')).toBeUndefined();
    expect(registry.list().some((skill) => skill.id === 'clarify-requirements')).toBe(true);
  });
});

describe('assistant skill marker parsing', () => {
  it('extracts a closed skill marker and hides it from visible content', () => {
    const parsed = parseAssistantSkillMarker(
      '先确认动机。<novella-skill id="propose-candidate"></novella-skill>'
    );
    expect(parsed.content).toBe('先确认动机。');
    expect(parsed.skillId).toBe('propose-candidate');
  });

  it('ignores unknown ids and hides unclosed markers', () => {
    expect(parseAssistantSkillMarker('正文。<novella-skill id="shell">').skillId).toBeNull();
    expect(hideAssistantSkillMarker('正文。<novella-skill id="propose-memory">')).toBe('正文。');
  });
});

describe('multi-skill closer contract', () => {
  it('asks for one closer only when two or more catalog skills are selected', () => {
    const twoSkills = formatSelectedSkillsForPrompt(
      ['ae-ideate', 'ae-doc-humanize'],
      AE_ASSISTANT_SKILLS
    );
    expect(twoSkills).toContain('ae-ideate');
    expect(twoSkills).toContain('ae-doc-humanize');
    expect(twoSkills).toContain(MULTI_SKILL_CLOSER_CONTRACT);
    expect(twoSkills).toContain('本轮结论');

    const oneSkill = formatSelectedSkillsForPrompt(['ae-ideate'], AE_ASSISTANT_SKILLS);
    expect(oneSkill).toContain('ae-ideate');
    expect(oneSkill).not.toContain(MULTI_SKILL_CLOSER_CONTRACT);
    expect(oneSkill).not.toContain('多个可见技能');
  });
});
