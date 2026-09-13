import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import HomeView from '@/features/home/components/HomeView';
import ProjectGrid from '@/features/home/components/ProjectGrid';
import { toast } from '@/shared/components/ui/toast';
import { useProjectStore } from '@/shared/stores/project-store';
import type { ProjectData } from '@/shared/types';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('@/features/project/components/AICreateProjectModal', () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) => (open ? <div>创建窗口</div> : null),
}));
jest.mock('@/features/home/components/HeroSection', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/shared/components/ui/toast', () => ({ toast: { success: jest.fn() } }));

const fixture = (id = 'home-fixture', status: ProjectData['status'] = 'draft'): ProjectData => ({
  id,
  name: `工程 ${id}`,
  status,
  aspectRatio: '9:16',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
});
const originalDelete = useProjectStore.getState().deleteProject;

beforeEach(() => {
  jest.clearAllMocks();
  useProjectStore.setState({
    projects: [fixture()],
    currentProject: null,
    deleteProject: originalDelete,
  });
});

afterEach(() => {
  useProjectStore.setState({ deleteProject: originalDelete });
});

test('uses native open buttons without nested actions and preserves route identity', () => {
  render(<ProjectGrid projects={[fixture()]} loading={false} />);
  const open = screen.getByRole('button', { name: '打开工程 工程 home-fixture' });
  expect(open.tagName).toBe('BUTTON');
  expect(open.querySelector('button')).toBeNull();
  fireEvent.click(open);
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('/project/home-fixture');
  expect(useProjectStore.getState().currentProject?.id).toBe('home-fixture');
});

test.each(['draft', 'processing', 'completed', 'failed'] as const)(
  'shows actual %s status and aspect ratio',
  (status) => {
    render(<ProjectGrid projects={[fixture('status', status)]} loading={false} />);
    const labels = { draft: '草稿', processing: '处理中', completed: '已完成', failed: '处理失败' };
    expect(screen.getByText(labels[status])).toBeInTheDocument();
    expect(screen.getByText('9:16')).toBeInTheDocument();
    expect(screen.queryByText(/100%|GPU|4K/)).not.toBeInTheDocument();
  }
);

test('distinguishes loading, empty and search-empty and supports clearing a trimmed search', () => {
  const { rerender } = render(<ProjectGrid projects={[]} loading />);
  expect(screen.getByRole('status')).toHaveTextContent('正在加载');
  rerender(<ProjectGrid projects={[]} loading={false} />);
  expect(screen.getByText('暂无漫剧创作工程')).toBeInTheDocument();
  rerender(<ProjectGrid projects={[fixture()]} loading={false} />);
  fireEvent.change(screen.getByRole('textbox', { name: '搜索漫剧工程' }), {
    target: { value: ' missing ' },
  });
  expect(screen.getByText('未找到匹配的漫剧工程')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '清除搜索' }));
  expect(screen.getByRole('button', { name: /打开工程/ })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: ' home-fixture ' } });
  expect(screen.getByRole('button', { name: /打开工程/ })).toBeInTheDocument();
});

test('cancel focuses the safe action and does not delete or navigate', () => {
  const remove = jest.fn();
  useProjectStore.setState({ deleteProject: remove });
  render(<ProjectGrid projects={[fixture()]} loading={false} />);
  fireEvent.click(screen.getByRole('button', { name: '删除工程 工程 home-fixture' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(/不会删除磁盘/)).toBeInTheDocument();
  const cancel = within(dialog).getByRole('button', { name: '取消' });
  expect(cancel).toHaveFocus();
  fireEvent.click(cancel);
  expect(remove).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('confirmation removes only the selected store record and presents bounded success', () => {
  useProjectStore.setState({ projects: [fixture(), fixture('keep')] });
  render(<HomeView />);
  fireEvent.click(screen.getByRole('button', { name: '删除工程 工程 home-fixture' }));
  fireEvent.click(screen.getByRole('button', { name: '确认移除' }));
  expect(useProjectStore.getState().projects.map((p) => p.id)).toEqual(['keep']);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(toast.success).toHaveBeenCalledWith('工程已从当前列表移除');
});

test('failure stays in the dialog without reporting success and permits retry', () => {
  const remove = jest
    .fn()
    .mockImplementationOnce(() => {
      throw new Error('synthetic failure');
    })
    .mockImplementation(originalDelete);
  useProjectStore.setState({ deleteProject: remove });
  render(<HomeView />);
  fireEvent.click(screen.getByRole('button', { name: '删除工程 工程 home-fixture' }));
  fireEvent.click(screen.getByRole('button', { name: '确认移除' }));
  expect(screen.getByRole('alert')).toHaveTextContent('无法移除工程');
  expect(toast.success).not.toHaveBeenCalled();
  expect(useProjectStore.getState().projects).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: '确认移除' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('a no-op delete does not claim success', () => {
  useProjectStore.setState({ deleteProject: jest.fn() });
  render(<HomeView />);
  fireEvent.click(screen.getByRole('button', { name: '删除工程 工程 home-fixture' }));
  fireEvent.click(screen.getByRole('button', { name: '确认移除' }));
  expect(screen.getByRole('alert')).toHaveTextContent('工程仍在列表中');
  expect(toast.success).not.toHaveBeenCalled();
});

test('the project hall searches beyond the ten most recent records', () => {
  useProjectStore.setState({
    projects: Array.from({ length: 12 }, (_, i) => fixture(`item-${i}`)),
  });
  render(<HomeView />);
  expect(screen.getAllByRole('article')).toHaveLength(12);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'item-11' } });
  expect(screen.getByRole('button', { name: '打开工程 工程 item-11' })).toBeInTheDocument();
});
