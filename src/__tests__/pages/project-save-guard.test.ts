import {
  getProjectPersistBlocker,
  resolveProjectPersistContent,
  resolveProjectPersistId,
} from '@/pages/project-edit/context/project-save-guard';

describe('project save guard', () => {
  it('allows saving confirmed characters without imported novel content', () => {
    expect(
      getProjectPersistBlocker({
        name: '股海浮沉',
        content: '',
        description: '20多岁打工人炒股',
        characterCount: 1,
      })
    ).toBeNull();
  });

  it('uses the project outline when novel content is empty', () => {
    expect(
      resolveProjectPersistContent({
        name: '股海浮沉',
        content: '   ',
        description: '20多岁打工人炒股',
        characterCount: 0,
      })
    ).toBe('20多岁打工人炒股');
  });

  it('does not ask to import a novel when only characters are being saved', () => {
    expect(
      getProjectPersistBlocker({
        name: '股海浮沉',
        characterCount: 1,
      })
    ).toBeNull();
  });

  it('persists edits to the route project instead of creating a new project id', () => {
    const createId = jest.fn(() => 'new-project-id');

    expect(resolveProjectPersistId(undefined, 'route-project-id', createId)).toBe(
      'route-project-id'
    );
    expect(createId).not.toHaveBeenCalled();
  });

  it('prefers an explicitly loaded project id when available', () => {
    expect(resolveProjectPersistId('loaded-project-id', 'route-project-id', () => 'new-id')).toBe(
      'loaded-project-id'
    );
  });
});
