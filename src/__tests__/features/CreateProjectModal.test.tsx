import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  CreateProjectModal,
  type InspirationContext,
} from '@/shared/components/project/CreateProjectModal';
import { useProjectStore } from '@/shared/stores/project-store';

jest.mock('@/shared/components/ui/toast', () => ({
  toast: { success: jest.fn(), warning: jest.fn() },
}));

async function* chunks(...items: string[]) {
  for (const item of items) yield item;
}

function renderModal(generateInspiration: (context: InspirationContext) => AsyncIterable<string>) {
  return render(
    <MemoryRouter>
      <CreateProjectModal open onOpenChange={jest.fn()} generateInspiration={generateInspiration} />
    </MemoryRouter>
  );
}

describe('CreateProjectModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProjectStore.setState({ projects: [], currentProject: null });
  });

  it('uses the configured dialogue stream and refills the editable project fields', async () => {
    const generateInspiration = jest.fn(() =>
      chunks('```json\n{"name":"霓虹剑仙","description":"数字剑修在赛博都市追查失控天道。"}\n```')
    );

    renderModal(generateInspiration);
    fireEvent.change(screen.getByPlaceholderText('例如：赛博修仙·第1季 或 龙王归来'), {
      target: { value: '剑修故事' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('简述核心故事梗概或看点，AI 将在分析时自动匹配镜头基调...'),
      {
        target: { value: '主角在未来都市寻找失散师门' },
      }
    );
    fireEvent.click(screen.getByRole('button', { name: '随机灵感' }));

    await waitFor(() => expect(generateInspiration).toHaveBeenCalledTimes(1));
    expect(generateInspiration).toHaveBeenCalledWith({
      projectName: '剑修故事',
      description: '主角在未来都市寻找失散师门',
      artStyle: '日系二次元',
      aspectRatio: '16:9',
    });

    expect(await screen.findByDisplayValue('霓虹剑仙')).toBeInTheDocument();
    expect(screen.getByDisplayValue('数字剑修在赛博都市追查失控天道。')).toBeInTheDocument();
  });

  it('falls back to a local inspiration when the dialogue service fails', async () => {
    const generateInspiration = jest.fn(() => {
      throw new Error('connection failed');
    });
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    renderModal(generateInspiration);
    fireEvent.click(screen.getByRole('button', { name: '随机灵感' }));

    expect(await screen.findByDisplayValue('赛博修仙：数字元神觉醒')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('在 2099 年的天道服务器中，凭借数字元神反抗黑神话财阀。')
    ).toBeInTheDocument();
    randomSpy.mockRestore();
  });
});
