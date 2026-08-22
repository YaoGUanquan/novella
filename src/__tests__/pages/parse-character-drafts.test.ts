import { parseCharacterDrafts } from '@/pages/project-edit/components/parse-character-drafts';

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
