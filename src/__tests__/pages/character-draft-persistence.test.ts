import type { Character } from '@/core/script/types/novel';
import {
  loadCharacterDrafts,
  loadOutlineDraft,
  saveCharacterDrafts,
  saveOutlineDraft,
} from '@/pages/project-edit/components/character-draft-persistence';

const PROJECT_ID = 'project-character-drafts';

function draftCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'character_1',
    name: '牛来',
    role: 'protagonist',
    description: '央企驻场员工',
    personality: '隐忍',
    background: '被催婚后开始炒股',
    gender: 'male',
    age: '28',
    appearance: {
      hairStyle: '短发',
      hairColor: '#2C2C2C',
      eyeColor: '#3B2F2F',
      skinTone: '#F5D6BA',
      bodyType: 'slim',
      height: '175',
    },
    clothing: [{ type: 'top', name: '皱衬衫', style: 'office', color: '#E8E8E8' }],
    ...overrides,
  };
}

describe('character draft persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('restores AI-backfilled drafts after a restart', () => {
    saveCharacterDrafts(PROJECT_ID, [draftCharacter()]);

    expect(loadCharacterDrafts(PROJECT_ID)).toEqual([draftCharacter()]);
  });

  it('keeps appearance and clothing when restoring drafts', () => {
    saveCharacterDrafts(PROJECT_ID, [draftCharacter()]);

    const [restored] = loadCharacterDrafts(PROJECT_ID);
    expect(restored.appearance).toEqual(draftCharacter().appearance);
    expect(restored.clothing).toEqual(draftCharacter().clothing);
  });

  it('does not persist drafts without a project id', () => {
    saveCharacterDrafts(undefined, [draftCharacter()]);

    expect(localStorage.length).toBe(0);
    expect(loadCharacterDrafts(undefined)).toEqual([]);
  });

  it('returns an empty list when stored drafts are invalid', () => {
    localStorage.setItem(`novella_character_drafts_v1:${PROJECT_ID}`, '{not-json');

    expect(loadCharacterDrafts(PROJECT_ID)).toEqual([]);
  });

  it('clears stored drafts when the next list is empty', () => {
    saveCharacterDrafts(PROJECT_ID, [draftCharacter()]);
    saveCharacterDrafts(PROJECT_ID, []);

    expect(loadCharacterDrafts(PROJECT_ID)).toEqual([]);
  });
});

describe('outline draft persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('restores an AI-generated outline after a restart', () => {
    saveOutlineDraft(PROJECT_ID, '牛来用十万本金开始炒股。');
    expect(loadOutlineDraft(PROJECT_ID)).toBe('牛来用十万本金开始炒股。');
  });

  it('clears the stored outline when the next draft is empty', () => {
    saveOutlineDraft(PROJECT_ID, '先有大纲');
    saveOutlineDraft(PROJECT_ID, '  ');
    expect(loadOutlineDraft(PROJECT_ID)).toBe('');
  });
});
