import { render, screen } from '@testing-library/react';

import { AssistantInfoCard } from '@/features/creative-assistant/components/AssistantInfoCard';
import { AssistantMarkdown } from '@/features/creative-assistant/components/AssistantMarkdown';

describe('AssistantInfoCard', () => {
  it('renders each confirmed fact as its own item instead of a semicolon paragraph', () => {
    render(
      <AssistantInfoCard
        title="本轮识别结果（确认后才会记住）"
        rows={[{ label: '已确认', values: ['项目名是股海浮沉', '主角牛来是大学刚毕业的金融新兵'] }]}
      />
    );

    expect(screen.getByText('本轮识别结果（确认后才会记住）')).toBeInTheDocument();
    expect(screen.getByText('已确认')).toBeInTheDocument();
    expect(screen.getByText('项目名是股海浮沉')).toBeInTheDocument();
    expect(screen.getByText('主角牛来是大学刚毕业的金融新兵')).toBeInTheDocument();
    expect(screen.queryByText(/项目名是股海浮沉；主角牛来/)).not.toBeInTheDocument();
  });

  it('uses forced light ink on the dark memory panel tone', () => {
    render(<AssistantInfoCard tone="panel" rows={[{ label: '意图', values: ['完善角色'] }]} />);

    const card = screen.getByTestId('creative-assistant-info-card');
    expect(card.className).toMatch(/!bg-slate-800/);
    expect(card.className).toMatch(/!text-white/);
    expect(screen.getByText('意图').className).toMatch(/!text-slate-300/);
    expect(screen.getByText('完善角色').className).toMatch(/!text-white/);
  });
});

describe('AssistantMarkdown info rows', () => {
  it('turns confirmed character lists into the shared info card', () => {
    render(
      <AssistantMarkdown
        content={[
          '**已确认角色信息**',
          '',
          '- 角色名称：牛来',
          '- 角色定位：主角',
          '- 性格：外冷内热；做事谨慎',
        ].join('\n')}
      />
    );

    expect(screen.getByRole('heading', { name: '已确认角色信息' })).toBeInTheDocument();
    expect(screen.getByTestId('creative-assistant-info-card')).toBeInTheDocument();
    expect(screen.getByText('角色名称')).toBeInTheDocument();
    expect(screen.getByText('牛来')).toBeInTheDocument();
    expect(screen.getByText('外冷内热')).toBeInTheDocument();
    expect(screen.getByText('做事谨慎')).toBeInTheDocument();
    expect(screen.queryByText('角色名称：牛来')).not.toBeInTheDocument();
  });

  it('keeps generic option lists as ordinary markdown', () => {
    render(<AssistantMarkdown content={'- 方向1：职场工具人\n- 方向2：学历光环'} />);

    expect(screen.queryByTestId('creative-assistant-info-card')).not.toBeInTheDocument();
    expect(screen.getByText('方向1：职场工具人')).toBeInTheDocument();
  });
});
