import { ASSISTANT_SKILL_IDS, isAssistantSkillId } from './ae-catalog';
import type { AssistantSkill, AssistantSkillId } from './types';

const SKILL_TAG = /<novella-skill\b([^>]*)(?:\/>|>([\s\S]*?)<\/novella-skill\s*>)/i;
const SKILL_START_TAG = /<novella-skill\b/i;

function readSkillId(attributes: string): string {
  const match = attributes.match(/\bid\s*=\s*["']([^"']+)["']/i);
  return match?.[1]?.trim() ?? '';
}

export function hideAssistantSkillMarker(content: string): string {
  const start = content.search(SKILL_START_TAG);
  return start >= 0 ? content.slice(0, start).trimEnd() : content;
}

export function parseAssistantSkillMarker(raw: string): {
  content: string;
  skillId: AssistantSkillId | null;
} {
  const closed = raw.match(SKILL_TAG);
  if (closed?.index !== undefined) {
    const skillId = readSkillId(closed[1] ?? '');
    return {
      content: `${raw.slice(0, closed.index)}${raw.slice(closed.index + closed[0].length)}`.trim(),
      skillId: isAssistantSkillId(skillId) ? skillId : null,
    };
  }

  const start = raw.search(SKILL_START_TAG);
  if (start < 0) return { content: raw.trim(), skillId: null };

  const open = raw.slice(start).match(/^<novella-skill\b([^>]*)>/i);
  const skillId = readSkillId(open?.[1] ?? '');
  return {
    content: raw.slice(0, start).trim(),
    skillId: isAssistantSkillId(skillId) ? skillId : null,
  };
}

export const MULTI_SKILL_CLOSER_CONTRACT = [
  '本轮点选了多个可见技能。必须按技能分节完成每一项正文并保留各自结果；',
  '各技能正文内不要写「最小下一步推荐」或另一套请确认。',
  '在全文最后、技能标记和状态标记之前，只写一次「本轮结论」：一句建议，加上 2 到 3 个互斥选项，用户只需回复其中一项。',
].join('');

export function formatEnabledSkillsForPrompt(
  skills: Array<Pick<AssistantSkill, 'id' | 'label' | 'description'>>
): string {
  if (skills.length === 0) return '';
  const list = skills
    .map((skill) => `- ${skill.id}：${skill.label}。${skill.description}`)
    .join('\n');
  return `\n\n可用技能（只能使用下列 id，每轮最多一个）：\n${list}\n调用时在正文末尾、状态标记之前追加：<novella-skill id="技能id"></novella-skill>\n不要编造未列出的技能，也不要声称已经回填表单或保存记忆。`;
}

export function formatSelectedSkillsForPrompt(
  ids: AssistantSkillId[],
  skills: AssistantSkill[] = []
): string {
  if (ids.length === 0) return '';
  const selected = ids.filter((id) => ASSISTANT_SKILL_IDS.includes(id));
  if (selected.length === 0) return '';
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const instructions = selected
    .map((id) => byId.get(id))
    .filter((skill): skill is AssistantSkill => Boolean(skill?.instruction))
    .map((skill) => `- ${skill.id}（${skill.label}）：${skill.instruction}`)
    .join('\n');
  const header = `\n用户本轮点选了：${selected.join('、')}。优先遵守点选，仍须使用技能标记声明实际调用。`;
  const catalogSelectedCount = selected.filter(
    (id) => byId.get(id)?.visibility === 'user-selectable'
  ).length;
  const closer = catalogSelectedCount >= 2 ? `\n${MULTI_SKILL_CLOSER_CONTRACT}` : '';
  return instructions
    ? `${header}\n本轮附加指令：\n${instructions}${closer}`
    : `${header}${closer}`;
}
