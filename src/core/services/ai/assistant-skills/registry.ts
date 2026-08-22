import { BUILTIN_ASSISTANT_SKILLS } from './ae-catalog';
import type { AssistantSkill, AssistantSkillCall } from './types';

export class AssistantSkillRegistry {
  private readonly skills = new Map<string, AssistantSkill>();

  constructor(initial: AssistantSkill[] = BUILTIN_ASSISTANT_SKILLS) {
    initial.forEach((skill) => this.register(skill));
  }

  register(skill: AssistantSkill): void {
    this.skills.set(skill.id, skill);
  }

  unregister(id: string): boolean {
    return this.skills.delete(id);
  }

  list(): AssistantSkill[] {
    return Array.from(this.skills.values());
  }

  alwaysOn(): AssistantSkill[] {
    return this.list().filter((skill) => skill.visibility === 'always-on');
  }

  userSelectable(): AssistantSkill[] {
    return this.list().filter((skill) => skill.visibility === 'user-selectable');
  }

  get(id: string): AssistantSkill | undefined {
    return this.skills.get(id);
  }

  enabled(enabledIds: Iterable<string>): AssistantSkill[] {
    const allowed = new Set(enabledIds);
    return this.list().filter((skill) => allowed.has(skill.id));
  }

  resolve(id: string, enabledIds: Iterable<string>): AssistantSkillCall {
    const skill = this.skills.get(id);
    if (!skill) {
      return { id, status: 'rejected', reason: '未知技能' };
    }
    const allowed = new Set(enabledIds);
    if (!allowed.has(skill.id)) {
      return { id: skill.id, status: 'rejected', reason: '技能已禁用' };
    }
    return { id: skill.id, status: 'accepted' };
  }
}

export const assistantSkillRegistry = new AssistantSkillRegistry();
