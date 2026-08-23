import {
  parseCharacterDrafts,
  parsePlanningDrafts,
} from '@/pages/project-edit/components/parse-character-drafts';

describe('parseCharacterDrafts', () => {
  it('keeps appearance and clothing on a complete character draft', () => {
    const characters = parseCharacterDrafts(
      JSON.stringify([
        {
          name: '牛来',
          role: 'protagonist',
          description: '央企驻场员工',
          personality: '隐忍',
          background: '被催婚后开始炒股',
          gender: 'male',
          age: '28',
          features: ['疲惫'],
          appearance: {
            hairStyle: '短发',
            hairColor: '#2C2C2C',
            eyeColor: '#3B2F2F',
            skinTone: '#F5D6BA',
            bodyType: 'thin',
            height: '175',
            features: ['黑眼圈'],
          },
          clothing: [
            {
              type: 'top',
              name: '皱衬衫',
              style: 'office',
              color: '#E8E8E8',
            },
          ],
        },
      ])
    );

    expect(characters[0].name).toBe('牛来');
    expect(characters[0].appearance?.hairStyle).toBe('短发');
    expect(characters[0].appearance?.bodyType).toBe('slim');
    expect(characters[0].appearance?.height).toBe('175');
    expect(characters[0].appearance?.features).toEqual(['黑眼圈', '疲惫']);
    expect(characters[0].clothing?.[0]).toMatchObject({ type: 'top', name: '皱衬衫' });
  });

  it('merges top-level height, bodyType and features into appearance', () => {
    const characters = parseCharacterDrafts(
      JSON.stringify([
        {
          name: '牛来',
          role: 'main',
          height: 175,
          bodyType: 'thin',
          features: ['疲惫', '黑眼圈'],
          appearance: { hairColor: '黑色', eyeColor: '黑褐色', skinTone: '白皙' },
        },
      ])
    );
    expect(characters[0].appearance).toMatchObject({
      hairColor: '黑色',
      eyeColor: '黑褐色',
      skinTone: '白皙',
      height: 175,
      bodyType: 'slim',
      features: ['疲惫', '黑眼圈'],
    });
  });

  it('accepts legacy drafts without appearance or clothing', () => {
    const characters = parseCharacterDrafts('[{"name":"牛来","role":"main"}]');
    expect(characters[0].name).toBe('牛来');
    expect(characters[0].appearance).toBeUndefined();
    expect(characters[0].clothing).toBeUndefined();
  });
});

describe('parsePlanningDrafts', () => {
  it('backfills an outline generated from the character, not just the character list', () => {
    const draft = parsePlanningDrafts(
      JSON.stringify({
        outline: '牛来在央企驻场加班，婚后贷款压力下从十万本金开始炒股。',
        characters: [{ name: '牛来', role: 'protagonist' }],
      })
    );

    expect(draft.outline).toBe('牛来在央企驻场加班，婚后贷款压力下从十万本金开始炒股。');
    expect(draft.characters[0].name).toBe('牛来');
  });

  it('still accepts a legacy character array without throwing', () => {
    const draft = parsePlanningDrafts('[{"name":"牛来","role":"main"}]');
    expect(draft.characters[0].name).toBe('牛来');
    expect(draft.outline).toBe('');
  });

  it('accepts an outline-only draft so the user can save it back like a character', () => {
    const draft = parsePlanningDrafts(
      JSON.stringify({ outline: '职场工具人在股市里寻找翻身的幻觉。' })
    );
    expect(draft.characters).toEqual([]);
    expect(draft.outline).toBe('职场工具人在股市里寻找翻身的幻觉。');
  });

  it('recovers the outline and complete characters when later JSON is truncated', () => {
    const truncated = [
      '{',
      '  "outline": "牛来在周一早晨打开证券APP。",',
      '  "characters": [',
      '    { "name": "牛来", "role": "main", "description": "央企员工" },',
      '    { "name": "英工", "role": "mentor", "description": "领导" },',
      '    { "name": "钱老", "role": "mentor", "appearance": { "eyeColor": "#d3a5a',
    ].join('\n');

    const draft = parsePlanningDrafts(truncated);
    expect(draft.outline).toBe('牛来在周一早晨打开证券APP。');
    expect(draft.characters.map((character) => character.name)).toEqual(['牛来', '英工']);
  });

  it('throws a Chinese message instead of a raw JSON syntax error', () => {
    expect(() => parsePlanningDrafts('{ "outline": ')).toThrow(/不完整|截断|尚未包含|可用/);
    try {
      parsePlanningDrafts('{ "outline": ');
    } catch (error) {
      expect((error as Error).message).not.toMatch(/Expected|position \d+/i);
    }
  });
});
