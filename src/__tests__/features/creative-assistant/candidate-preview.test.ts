import {
  buildCandidatePreview,
  coerceCandidateValue,
  looksLikeStructuredDraft,
} from '@/features/creative-assistant/candidate-preview';

describe('buildCandidatePreview', () => {
  it('renders character fields with Chinese labels and nested appearance', () => {
    const nodes = buildCandidatePreview([
      {
        id: 'character_1',
        name: '牛来',
        role: 'protagonist',
        description: '职场工具人',
        appearance: { hairStyle: '短发', hairColor: '黑' },
        clothing: [{ type: 'top', name: '白衬衫', style: 'casual' }],
      },
    ]);

    expect(nodes).toEqual([
      expect.objectContaining({
        kind: 'item',
        title: '牛来',
        children: expect.arrayContaining([
          { kind: 'field', label: '角色名称', value: '牛来' },
          { kind: 'field', label: '角色定位', value: '主角' },
          { kind: 'field', label: '简介', value: '职场工具人' },
          expect.objectContaining({
            kind: 'group',
            label: '外观',
            children: [
              { kind: 'field', label: '发型', value: '短发' },
              { kind: 'field', label: '发色', value: '黑' },
            ],
          }),
          expect.objectContaining({
            kind: 'group',
            label: '服饰',
          }),
        ]),
      }),
    ]);
    expect(JSON.stringify(nodes)).toContain('白衬衫');
    expect(JSON.stringify(nodes)).toContain('上装');
    expect(JSON.stringify(nodes)).not.toContain('character_1');
  });

  it('unwraps JSON that was returned as a quoted string', () => {
    const quoted = JSON.stringify('[{"name":"牛来","role":"protagonist"}]');
    expect(looksLikeStructuredDraft(quoted)).toBe(true);
    expect(buildCandidatePreview(quoted)[0]).toEqual(
      expect.objectContaining({ kind: 'item', title: '牛来' })
    );
  });

  it('parses a JSON string candidate used by generic sheet tests', () => {
    const nodes = buildCandidatePreview('[{"name":"牛来","role":"protagonist"}]');
    expect(nodes[0]).toEqual(expect.objectContaining({ kind: 'item', title: '牛来' }));
  });

  it('skips empty fields and keeps unknown keys', () => {
    const nodes = buildCandidatePreview({ name: '牛来', description: '', camera: 'Medium' });
    expect(nodes).toEqual([
      { kind: 'field', label: '角色名称', value: '牛来' },
      { kind: 'field', label: '机位', value: 'Medium' },
    ]);
  });

  it('omits clothing item name from fields so the card title is not duplicated as 角色名称', () => {
    const nodes = buildCandidatePreview([
      {
        name: '牛来',
        clothing: [{ type: 'head', name: '普通眼镜', style: 'formal' }],
      },
    ]);
    const clothing = JSON.stringify(
      nodes
        .find((node) => node.kind === 'item')
        ?.children.find((child) => child.kind === 'group' && child.label === '服饰')
    );
    expect(clothing).toContain('普通眼镜');
    expect(clothing).toContain('头饰');
    expect(clothing).toContain('正式');
    expect(clothing).not.toContain('角色名称');
    expect(clothing).not.toContain('"label":"名称"');
  });

  it('labels a planning outline for review before save', () => {
    const nodes = buildCandidatePreview({
      outline: '牛来用十万本金开始炒股。',
      characters: [{ name: '牛来', role: 'protagonist' }],
    });
    expect(nodes).toEqual(
      expect.arrayContaining([
        { kind: 'field', label: '剧情大纲', value: '牛来用十万本金开始炒股。' },
        expect.objectContaining({
          kind: 'group',
          label: '角色',
        }),
      ])
    );
  });

  it('leaves non-json strings as readable content', () => {
    expect(coerceCandidateValue('先看草稿')).toBe('先看草稿');
    expect(buildCandidatePreview('先看草稿')).toEqual([
      { kind: 'field', label: '内容', value: '先看草稿' },
    ]);
  });
});
