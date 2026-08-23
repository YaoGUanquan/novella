import {
  buildProjectHydrationKey,
  mergeProjectLoadSources,
  selectProjectLoadFallback,
  shouldHydrateProjectCharacters,
} from '@/pages/project-edit/hooks/project-load-merge';

describe('mergeProjectLoadSources', () => {
  it('prefers file characters when the store project has none', () => {
    const merged = mergeProjectLoadSources(
      { content: '大纲', characters: [] },
      { content: '大纲', characters: [{ id: 'c1', name: '牛来' }] }
    );

    expect(merged?.characters).toEqual([{ id: 'c1', name: '牛来' }]);
  });

  it('keeps store characters when the file has not persisted any', () => {
    const merged = mergeProjectLoadSources(
      { content: '大纲', characters: [{ id: 'c1', name: '牛来' }] },
      { content: '大纲', characters: [] }
    );

    expect(merged?.characters).toEqual([{ id: 'c1', name: '牛来' }]);
  });

  it('returns the file project when the store is empty', () => {
    const file = { content: '大纲', characters: [{ id: 'c1', name: '牛来' }] };

    expect(mergeProjectLoadSources(null, file)).toEqual(file);
  });
});

describe('buildProjectHydrationKey', () => {
  it('changes when persisted characters arrive after a store-first paint', () => {
    const withoutCharacters = buildProjectHydrationKey({
      projectId: 'prj-1',
      content: '大纲',
      charactersLength: 0,
    });
    const withCharacters = buildProjectHydrationKey({
      projectId: 'prj-1',
      content: '大纲',
      charactersLength: 1,
    });

    expect(withoutCharacters).not.toBe(withCharacters);
  });

  it('changes when reference images change without changing character count', () => {
    const withoutReference = buildProjectHydrationKey({
      projectId: 'prj-1',
      content: '大纲',
      charactersLength: 1,
      characters: [{ id: 'c1', consistency: { referenceImages: [] } }],
    });
    const withReference = buildProjectHydrationKey({
      projectId: 'prj-1',
      content: '大纲',
      charactersLength: 1,
      characters: [{ id: 'c1', consistency: { referenceImages: ['assets/images/c1.jpg'] } }],
    });

    expect(withoutReference).not.toBe(withReference);
  });
});

describe('selectProjectLoadFallback', () => {
  it('does not hydrate a route from an unrelated current project', () => {
    expect(
      selectProjectLoadFallback(
        [{ id: 'project-a', name: 'A' }],
        { id: 'project-a', name: 'A' },
        'project-b'
      )
    ).toBeNull();
  });

  it('selects the matching project from the stored list', () => {
    expect(
      selectProjectLoadFallback(
        [
          { id: 'project-a', name: 'A' },
          { id: 'project-b', name: 'B' },
        ],
        { id: 'project-a', name: 'A' },
        'project-b'
      )
    ).toEqual({ id: 'project-b', name: 'B' });
  });
});

describe('shouldHydrateProjectCharacters', () => {
  it('does not replace locally edited characters with a late stale project snapshot', () => {
    expect(
      shouldHydrateProjectCharacters({
        hasLocalCharacterEdits: true,
        incomingCharacters: [{ id: 'c1', consistency: { referenceImages: [] } }],
      })
    ).toBe(false);
  });

  it('hydrates initial characters before the editor has local changes', () => {
    expect(
      shouldHydrateProjectCharacters({
        hasLocalCharacterEdits: false,
        incomingCharacters: [{ id: 'c1' }],
      })
    ).toBe(true);
  });
});
