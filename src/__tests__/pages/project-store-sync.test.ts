import type { Character } from '@/core/script/types/novel';
import { syncPersistedProjectToStore } from '@/pages/project-edit/context/project-store-sync';
import { useProjectStore } from '@/shared/stores/project-store';

function character(): Character {
  return {
    id: 'character_1',
    name: '牛来',
    role: 'protagonist',
    description: '央企驻场员工',
    personality: '隐忍',
    background: '被催婚后开始炒股',
  };
}

describe('syncPersistedProjectToStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectStore.setState({ projects: [], currentProject: null });
  });

  it('writes confirmed characters onto an existing store project', () => {
    const existing = useProjectStore.getState().createProject({
      name: '测试工程',
      content: '大纲',
    });

    syncPersistedProjectToStore({
      ...existing,
      characters: [character()],
    });

    const stored = useProjectStore
      .getState()
      .projects.find((project) => project.id === existing.id);
    expect(stored?.characters).toEqual([character()]);
    expect(useProjectStore.getState().currentProject?.characters).toEqual([character()]);
  });
});
