export type ProductAssistantSkillId =
  | 'clarify-requirements'
  | 'propose-candidate'
  | 'propose-memory';
export type CatalogAssistantSkillId =
  | 'ae-ideate'
  | 'ae-doc-structure'
  | 'ae-doc-humanize'
  | 'ae-imagegen-prompt'
  | 'ae-review';
export type AssistantSkillId = ProductAssistantSkillId | CatalogAssistantSkillId;
export type AssistantSkillSideEffect = 'none' | 'candidate-proposal' | 'memory-proposal';
export type AssistantSkillVisibility = 'always-on' | 'user-selectable';

export interface AssistantSkill {
  id: AssistantSkillId;
  label: string;
  description: string;
  sideEffect: AssistantSkillSideEffect;
  visibility: AssistantSkillVisibility;
  instruction: string;
  sourceSkill?: string;
  sourceRepo?: string;
}

export interface AssistantSkillCall {
  id: string;
  status: 'accepted' | 'rejected';
  reason?: string;
}
