import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { aiService } from '@/core/services';
import { ConfiguredDialogueError } from '@/core/services/ai/text/ai-service';
import { AICreativeAssistantSheet } from '@/features/creative-assistant';

jest.mock('@/core/services', () => ({
  aiService: { streamGenerate: jest.fn(), streamConfiguredDialogue: jest.fn() },
}));

async function* chunks(...items: string[]) {
  for (const item of items) yield item;
}

function expandThinkingTraces() {
  screen.getAllByRole('button', { name: /思考过程/ }).forEach((button) => {
    if (button.getAttribute('aria-expanded') === 'false') {
      fireEvent.click(button);
    }
  });
}

describe('AICreativeAssistantSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    delete (aiService as { streamConfiguredDialogueEvents?: unknown })
      .streamConfiguredDialogueEvents;
  });

  it('keeps header conversation actions separate from the sheet close control', () => {
    render(
      <AICreativeAssistantSheet
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(screen.getByLabelText('AI 对话输入').closest('.bg-white')).toBeTruthy();
    expect(screen.getByRole('button', { name: '新建对话' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清空当前对话' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('keeps SSE conversation separate until the user confirms form fill', async () => {
    const onApply = jest.fn();
    (aiService.streamConfiguredDialogue as jest.Mock)
      .mockImplementationOnce(() => chunks('我已理解项目背景，请补充主角的核心动机。'))
      .mockImplementationOnce(() => chunks('请补充主角的动机。'))
      .mockImplementationOnce(() => chunks('可回填角色草稿'));

    render(
      <AICreativeAssistantSheet
        targetLabel="角色设定"
        projectContext="主角李先前世是武学宗师。"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={onApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('我已理解项目背景，请补充主角的核心动机。')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('AI 对话输入'), {
      target: { value: '我想突出他的孤傲感' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    expect(await screen.findByText('请补充主角的动机。')).toBeInTheDocument();
    expect(
      screen
        .getByText('我想突出他的孤傲感')
        .closest('[data-testid="creative-assistant-user-message"]')?.className
    ).toMatch(/bg-white/);
    expect(
      screen
        .getByText('我想突出他的孤傲感')
        .closest('[data-testid="creative-assistant-user-message"]')?.className
    ).toMatch(/text-slate-900/);
    expect(
      screen
        .getByText('我想突出他的孤傲感')
        .closest('[data-testid="creative-assistant-user-message"]')?.className
    ).not.toMatch(/text-indigo-50/);
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '生成可回填草稿' }));
    expect(await screen.findByRole('button', { name: '填充表单' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '填充表单' }));
    expect(screen.getByText('确认填充角色设定？')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认填充' }));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith('可回填角色草稿'));
  });

  it('does not apply a candidate when the confirmation is cancelled', async () => {
    const onApply = jest.fn();
    (aiService.streamConfiguredDialogue as jest.Mock)
      .mockImplementationOnce(() => chunks('我已理解项目背景。'))
      .mockImplementationOnce(() => chunks('候选文本'));

    render(
      <AICreativeAssistantSheet
        targetLabel="分镜草稿"
        projectContext="一段故事"
        candidateInstructions="返回分镜 JSON"
        parseCandidate={(raw) => raw}
        onApply={onApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开分镜草稿 AI 助手' }));
    expect(await screen.findByText('我已理解项目背景。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '生成可回填草稿' }));
    expect(await screen.findByRole('button', { name: '填充表单' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '填充表单' }));
    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(onApply).not.toHaveBeenCalled();
  });

  it('keeps an invalid candidate available for copying without exposing form fill', async () => {
    const onApply = jest.fn();
    (aiService.streamConfiguredDialogue as jest.Mock)
      .mockImplementationOnce(() => chunks('我已理解项目背景。'))
      .mockImplementationOnce(() => chunks('not valid json'));

    render(
      <AICreativeAssistantSheet
        targetLabel="分镜草稿"
        projectContext="一段故事"
        candidateInstructions="返回分镜 JSON"
        parseCandidate={() => {
          throw new Error('候选稿必须是 JSON 数组');
        }}
        onApply={onApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开分镜草稿 AI 助手' }));
    expect(await screen.findByText('我已理解项目背景。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '生成可回填草稿' }));

    expect(await screen.findByText('候选稿必须是 JSON 数组')).toBeInTheDocument();
    expect(screen.getAllByText('not valid json')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: '填充表单' })).not.toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('initializes an empty conversation with project context and starts one more after new conversation', async () => {
    const onApply = jest.fn();
    (aiService.streamConfiguredDialogue as jest.Mock)
      .mockImplementationOnce(() => chunks('我理解这是复仇故事。'))
      .mockImplementationOnce(() => chunks('我们重新梳理角色设定。'));

    render(
      <AICreativeAssistantSheet
        projectId="prj-context"
        targetLabel="角色设定"
        projectContext="项目名称：天下无敌！\n项目简介：武道宗师转生后的复仇故事。\n项目正文：李先前世是武学宗师。"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={onApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));

    await waitFor(() => {
      expect(aiService.streamConfiguredDialogue).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('项目名称：天下无敌！'),
          }),
        ]),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
    expect(aiService.streamGenerate).not.toHaveBeenCalled();

    expect(await screen.findByText('我理解这是复仇故事。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '新建对话' }));
    await waitFor(() => expect(aiService.streamConfiguredDialogue).toHaveBeenCalledTimes(2));
    const secondRequest = (aiService.streamConfiguredDialogue as jest.Mock).mock.calls[1][0];
    expect(secondRequest).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('项目名称：天下无敌！'),
        }),
      ])
    );
    expect(JSON.stringify(secondRequest)).not.toContain('apiKey');
  });

  it('replaces the pending indicator with a failure message when the dialogue service cannot connect', async () => {
    const onApply = jest.fn();
    (aiService.streamConfiguredDialogue as jest.Mock).mockImplementationOnce(async function* () {
      yield* [];
      throw new ConfiguredDialogueError({
        kind: 'transport',
        endpoint: 'https://dialogue.example/v1',
      });
    });

    render(
      <AICreativeAssistantSheet
        targetLabel="角色设定"
        projectContext="项目名称：天下无敌！"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={onApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('本次请求未完成。')).toBeInTheDocument();
    expect(screen.getByText(/无法连接到 dialogue\.example/)).toBeInTheDocument();
    expect(screen.queryByText('AI 正在输入...')).not.toBeInTheDocument();
  });

  it('retries a failed assistant request without duplicating the conversation', async () => {
    (aiService.streamConfiguredDialogue as jest.Mock)
      .mockImplementationOnce(async function* () {
        yield* [];
        throw new ConfiguredDialogueError({
          kind: 'transport',
          endpoint: 'https://dialogue.example/v1',
        });
      })
      .mockImplementationOnce(() => chunks('重试成功的回复'));

    render(
      <AICreativeAssistantSheet
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    const retry = await screen.findByRole('button', { name: '重试本次请求' });
    fireEvent.click(retry);

    expect(await screen.findByText('重试成功的回复')).toBeInTheDocument();
    expect(screen.getAllByText(/重试成功的回复/)).toHaveLength(1);
    expect(aiService.streamConfiguredDialogue).toHaveBeenCalledTimes(2);
  });

  it('deletes a single message without clearing project memory', async () => {
    (aiService.streamConfiguredDialogue as jest.Mock).mockImplementationOnce(() =>
      chunks('待删除的回复')
    );

    render(
      <AICreativeAssistantSheet
        projectId="prj-delete"
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('待删除的回复')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: '删除消息' })[0]);
    expect(screen.queryByText('待删除的回复')).not.toBeInTheDocument();
  });

  it('requires explicit confirmation before saving a structured project memory', async () => {
    (aiService.streamConfiguredDialogue as jest.Mock).mockImplementation(() =>
      chunks(
        '我理解当前目标。<novella-state>{"intent":"完善角色","target":"角色设定","constraints":[],"confirmedFacts":["主角是抱丹宗师"],"openQuestions":["转生后的年龄"],"glossary":[{"term":"抱丹","meaning":"武学境界"}]}</novella-state>'
      )
    );

    render(
      <AICreativeAssistantSheet
        projectId="prj-memory"
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    const saveButton = await screen.findByRole('button', { name: '保存本轮记忆' });
    expect(screen.getByText('我理解当前目标。')).toBeInTheDocument();
    expect(screen.getByText('我理解当前目标。')).not.toHaveTextContent(/novella-state/i);
    expect(
      window.localStorage.getItem('novella_creative_assistant_memory_v1:prj-memory')
    ).toBeNull();

    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(screen.getAllByText('已确认：主角是抱丹宗师').length).toBeGreaterThan(0)
    );
    expect(
      JSON.parse(
        window.localStorage.getItem('novella_creative_assistant_memory_v1:prj-memory') ?? '{}'
      ).confirmedFacts
    ).toEqual(['主角是抱丹宗师']);
    expect(screen.getByRole('button', { name: '已保存到项目记忆' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(screen.getByRole('button', { name: '已保存到项目记忆' })).toBeDisabled();
  });

  it('keeps a saved memory turn disabled after the assistant remounts', async () => {
    (aiService.streamConfiguredDialogue as jest.Mock).mockImplementation(() =>
      chunks(
        '我理解当前目标。<novella-state>{"intent":"完善角色","target":"角色设定","constraints":[],"confirmedFacts":["主角是抱丹宗师"],"openQuestions":["转生后的年龄"],"glossary":[{"term":"抱丹","meaning":"武学境界"}]}</novella-state>'
      )
    );

    const props = {
      projectId: 'prj-memory-remount',
      targetLabel: '角色设定',
      projectContext: '项目正文',
      candidateInstructions: '返回角色设定正文',
      parseCandidate: (raw: string) => raw,
      onApply: jest.fn(),
    };
    const view = render(<AICreativeAssistantSheet {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    fireEvent.click(await screen.findByRole('button', { name: '保存本轮记忆' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '已保存到项目记忆' })).toBeDisabled()
    );

    view.unmount();
    render(<AICreativeAssistantSheet {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByRole('button', { name: '已保存到项目记忆' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '保存本轮记忆' })).not.toBeInTheDocument();
  });

  it('hides an unclosed state marker and keeps assistant paragraph breaks', async () => {
    (aiService.streamConfiguredDialogue as jest.Mock).mockImplementation(() =>
      chunks(
        '我理解当前目标。\n\n为了避免歧义，请先确认主角姓名。\n<novella-state>{"intent":"完善角色","target":"角色设定","constraints":[],"confirmedFacts":["项目名称是股海浮沉"],"openQuestions":["主角姓名"],"glossary":[]}'
      )
    );

    render(
      <AICreativeAssistantSheet
        projectId="prj-visible"
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('我理解当前目标。')).toBeInTheDocument();
    expect(screen.getByText('为了避免歧义，请先确认主角姓名。')).toBeInTheDocument();
    expect(screen.queryByText(/novella-state/i)).not.toBeInTheDocument();
    expect(screen.getByText('已确认：项目名称是股海浮沉')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存本轮记忆' })).toBeInTheDocument();
  });

  it('renders assistant markdown instead of raw markers', async () => {
    (aiService.streamConfiguredDialogue as jest.Mock).mockImplementation(() =>
      chunks(
        [
          '**ae-ideate 创作方向：**',
          '',
          '- 方向1：职场工具人',
          '',
          '**最小下一步推荐：** 请确认姓名',
        ].join('\n')
      )
    );

    render(
      <AICreativeAssistantSheet
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(
      await screen.findByRole('heading', { name: 'ae-ideate 创作方向：' })
    ).toBeInTheDocument();
    expect(screen.getByText('方向1：职场工具人')).toBeInTheDocument();
    expect(screen.getByText('最小下一步推荐：')).toBeInTheDocument();
    expect(screen.getByText(/请确认姓名/)).toBeInTheDocument();
    expect(screen.queryByText(/\*\*ae-ideate/)).not.toBeInTheDocument();
    expect(screen.getByTestId('creative-assistant-markdown')).toBeInTheDocument();
  });

  it('shows agent steps instead of model thinking text', async () => {
    const service = aiService as typeof aiService & { streamConfiguredDialogueEvents: jest.Mock };
    service.streamConfiguredDialogueEvents = jest
      .fn()
      .mockImplementationOnce(async function* () {
        yield { kind: 'thinking', text: '先想动机' };
        yield { kind: 'text', text: '建议突出孤傲。' };
      })
      .mockImplementationOnce(async function* () {
        yield { kind: 'thinking', text: '再想一遍' };
        yield { kind: 'text', text: '继续澄清即可。' };
      });

    render(
      <AICreativeAssistantSheet
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('建议突出孤傲。')).toBeInTheDocument();
    expect(screen.getByText('思考过程')).toBeInTheDocument();
    expandThinkingTraces();
    expect(screen.getByText(/请求对话模型/)).toBeInTheDocument();
    expect(screen.queryByText('先想动机')).not.toBeInTheDocument();
    expect(screen.queryByText('AI 正在输入...')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('AI 对话输入'), { target: { value: '再问一句' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    expect(await screen.findByText('继续澄清即可。')).toBeInTheDocument();
    expect(screen.queryByText('再想一遍')).not.toBeInTheDocument();
    expect(screen.getAllByText('思考过程').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps agent steps expanded while a reply is still streaming', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    (aiService.streamConfiguredDialogue as jest.Mock).mockImplementation(async function* () {
      await gate;
      yield '建议突出孤傲。';
    });

    render(
      <AICreativeAssistantSheet
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('正在思考')).toBeInTheDocument();
    expect(screen.getByText(/请求对话模型/)).toBeInTheDocument();
    expect(screen.queryByText('AI 正在输入...')).not.toBeInTheDocument();
    expect(screen.queryByText('建议突出孤傲。')).not.toBeInTheDocument();

    await act(async () => {
      release();
    });
    expect(await screen.findByText('建议突出孤傲。')).toBeInTheDocument();
    expect(screen.getByText('思考过程')).toBeInTheDocument();
    expect(screen.queryByText('正在思考')).not.toBeInTheDocument();
  });

  it('attaches skills from a multi-select dropdown and removes them with the chip', async () => {
    const onApply = jest.fn();
    (aiService.streamConfiguredDialogue as jest.Mock)
      .mockImplementationOnce(() => chunks('我已理解项目背景。'))
      .mockImplementationOnce(() => chunks('可回填角色草稿'));

    render(
      <AICreativeAssistantSheet
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={onApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('我已理解项目背景。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '选择技能' }));
    expect(screen.queryByRole('menuitemcheckbox', { name: '生成草稿' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitemcheckbox', { name: '澄清需求' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitemcheckbox', { name: '记忆提案' })).not.toBeInTheDocument();
    expect(await screen.findByRole('menuitemcheckbox', { name: '想法发散' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: '想法发散' }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: '结构化整理' }));
    expect(screen.getByRole('button', { name: '移除技能 想法发散' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移除技能 结构化整理' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '移除技能 想法发散' }));
    expect(screen.queryByRole('button', { name: '移除技能 想法发散' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移除技能 结构化整理' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '生成可回填草稿' }));
    expect(await screen.findByRole('button', { name: '填充表单' })).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('clears selected skill chips after sending a message', async () => {
    (aiService.streamConfiguredDialogue as jest.Mock)
      .mockImplementationOnce(() => chunks('我已理解项目背景。'))
      .mockImplementationOnce(() => chunks('结合上下文可以这样展开主角。'));

    render(
      <AICreativeAssistantSheet
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('我已理解项目背景。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '选择技能' }));
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: '想法发散' }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: '文案润色' }));
    expect(screen.getByRole('button', { name: '移除技能 想法发散' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移除技能 文案润色' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('AI 对话输入'), {
      target: { value: '主角的名字叫牛来' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    expect(await screen.findByText('结合上下文可以这样展开主角。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '移除技能 想法发散' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '移除技能 文案润色' })).not.toBeInTheDocument();
    const timelines = screen.getAllByTestId('creative-assistant-agent-steps');
    expect(timelines[timelines.length - 1].textContent).toContain('应用技能：想法发散、文案润色');
    expect(screen.queryByText('技能 想法发散 · 已调用')).not.toBeInTheDocument();
  });

  it('scrolls to the latest message when the assistant sheet opens', async () => {
    localStorage.setItem(
      'novella_creative_assistant_session_v1:prj-scroll',
      JSON.stringify([
        { id: 'm1', role: 'user', content: '最早的用户消息' },
        { id: 'm2', role: 'assistant', content: '中间的助手回复' },
        { id: 'm3', role: 'user', content: '较新的用户消息' },
        { id: 'm4', role: 'assistant', content: '这是最新的助手回复' },
      ])
    );

    render(
      <AICreativeAssistantSheet
        projectId="prj-scroll"
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('这是最新的助手回复')).toBeInTheDocument();
    expect(screen.getByTestId('creative-assistant-transcript-end')).toBeInTheDocument();
    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  it('explains an empty model reply instead of leaving a blank card', async () => {
    (aiService.streamConfiguredDialogue as jest.Mock)
      .mockImplementationOnce(() => chunks('我已理解项目背景。'))
      .mockImplementationOnce(async function* () {
        yield* [];
      });

    render(
      <AICreativeAssistantSheet
        projectId="prj-empty-body"
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('我已理解项目背景。')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('AI 对话输入'), {
      target: { value: '主角的名字叫牛来' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    expect(await screen.findByText('本轮没有生成可见回复。')).toBeInTheDocument();
    expect(screen.queryByText('AI 正在输入...')).not.toBeInTheDocument();
    expect(screen.getAllByText('思考过程').length).toBeGreaterThanOrEqual(2);
    const stored = window.localStorage.getItem(
      'novella_creative_assistant_session_v1:prj-empty-body'
    );
    expect(stored).toBeTruthy();
    expect(stored).not.toMatch(/thinking|reasoning/);
    expect(stored).toMatch(/请求对话模型/);
  });

  it('does not apply a candidate when the model proposes the write skill', async () => {
    const onApply = jest.fn();
    (aiService.streamConfiguredDialogue as jest.Mock)
      .mockImplementationOnce(() => chunks('我已理解项目背景。'))
      .mockImplementationOnce(() =>
        chunks('先生成草稿。<novella-skill id="propose-candidate"></novella-skill>')
      )
      .mockImplementationOnce(() => chunks('可回填角色草稿'));

    render(
      <AICreativeAssistantSheet
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={onApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('我已理解项目背景。')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('AI 对话输入'), { target: { value: '请给草稿' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    expect(await screen.findByText('先生成草稿。')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '填充表单' })).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('previews a character draft then persists only after in-chat save', async () => {
    const onApply = jest.fn();
    const onPersist = jest.fn();
    (aiService.streamConfiguredDialogue as jest.Mock)
      .mockImplementationOnce(() => chunks('我已理解项目背景。'))
      .mockImplementationOnce(() => chunks('[{"name":"牛来","role":"protagonist"}]'));

    render(
      <AICreativeAssistantSheet
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={onApply}
        autoPreviewCandidate
        persistLabel="保存角色"
        onPersist={onPersist}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('我已理解项目背景。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '生成可回填草稿' }));
    expect(await screen.findByRole('button', { name: '保存角色' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '填充表单' })).not.toBeInTheDocument();
    const preview = await screen.findByTestId('creative-assistant-candidate-preview');
    expect(preview.className).toMatch(/bg-slate-800/);
    expect(preview.className).toMatch(/text-white/);
    expect(preview).toHaveTextContent('角色名称');
    expect(preview).toHaveTextContent('牛来');
    expect(preview).toHaveTextContent('主角');
    expect(preview.textContent).not.toContain('"name"');
    expect(screen.getByText('查看原文')).toBeInTheDocument();
    expect(screen.getByText('草稿已放到下方候选稿，请核对后保存。')).toBeInTheDocument();
    const assistantMessages = screen.getAllByTestId('creative-assistant-assistant-message');
    expect(assistantMessages[assistantMessages.length - 1].textContent).not.toContain('"name"');
    await waitFor(() => expect(onApply).toHaveBeenCalled());
    expect(onPersist).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '保存角色' }));
    await waitFor(() => expect(onPersist).toHaveBeenCalled());
  });

  it('does not show quoted JSON under the thinking trace after a draft is generated', async () => {
    const quoted = JSON.stringify('[{"name":"牛来","role":"protagonist"}]');
    (aiService.streamConfiguredDialogue as jest.Mock)
      .mockImplementationOnce(() => chunks('我已理解项目背景。'))
      .mockImplementationOnce(() => chunks(quoted));

    render(
      <AICreativeAssistantSheet
        targetLabel="角色设定"
        projectContext="项目正文"
        candidateInstructions="返回角色设定正文"
        parseCandidate={(raw) => raw}
        onApply={jest.fn()}
        autoPreviewCandidate
        persistLabel="保存角色"
        onPersist={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '打开角色设定 AI 助手' }));
    expect(await screen.findByText('我已理解项目背景。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '生成可回填草稿' }));
    expect(await screen.findByText('草稿已放到下方候选稿，请核对后保存。')).toBeInTheDocument();
    const assistantMessages = screen.getAllByTestId('creative-assistant-assistant-message');
    expect(assistantMessages[assistantMessages.length - 1].textContent).not.toContain('\\"name\\"');
    expect(assistantMessages[assistantMessages.length - 1].textContent).not.toContain('"name"');
  });
});
