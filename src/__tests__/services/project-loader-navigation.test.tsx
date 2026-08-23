/**
 * project-loader-navigation.test.tsx — 进入已存在工程导航与加载单元测试套件
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { useProjectLoader } from '@/pages/project-edit/hooks/useProjectLoader';
import { useProjectStore } from '@/shared/stores/project-store';

const mockReadProjectFile = jest.fn();

jest.mock('@/core/services', () => ({
  tauriService: {
    readProjectFile: (...args: unknown[]) => mockReadProjectFile(...args),
  },
}));

describe('Project Loader & Existing Project Entry Verification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectStore.setState({ projects: [], currentProject: null });
    mockReadProjectFile.mockReset();
    mockReadProjectFile.mockRejectedValue(new Error('no project file'));
  });

  it('Should successfully load an existing project from useProjectStore by String(id)', async () => {
    const existingProject = useProjectStore.getState().createProject({
      name: '测试已存在赛博漫剧工程',
      description: '赛博修仙漫剧测试描述',
    });

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <MemoryRouter initialEntries={[`/project/edit/${existingProject.id}`]}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useProjectLoader(existingProject.id), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).not.toBeNull();
      expect(result.current.data?.name).toBe('测试已存在赛博漫剧工程');
    });
  });

  it('Should gracefully provide fallback context when accessing any unknown projectId', async () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <MemoryRouter initialEntries={['/project/edit/prj-unknown-999']}>{children}</MemoryRouter>
    );

    const { result } = renderHook(() => useProjectLoader('prj-unknown-999'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).not.toBeNull();
      expect(result.current.data?.name).toContain('prj-unkn');
    });
  });

  it('hydrates confirmed characters from the project file when the store list has none', async () => {
    const existingProject = useProjectStore.getState().createProject({
      name: '测试已存在赛博漫剧工程',
      description: '赛博修仙漫剧测试描述',
      content: '牛来的炒股大纲',
    });
    mockReadProjectFile.mockResolvedValue(
      JSON.stringify({
        id: existingProject.id,
        name: existingProject.name,
        description: existingProject.description,
        content: '牛来的炒股大纲',
        characters: [{ id: 'character_1', name: '牛来', role: 'protagonist' }],
      })
    );

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <MemoryRouter initialEntries={[`/project/edit/${existingProject.id}`]}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useProjectLoader(existingProject.id), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.characters?.[0]?.name).toBe('牛来');
    });
  });
});
