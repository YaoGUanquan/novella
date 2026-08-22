import {
  parseAssistantMarkdown,
  parseAssistantMarkdownInline,
} from '@/features/creative-assistant/assistant-markdown';

describe('assistant markdown', () => {
  it('turns bold-only lines into headings and list markers into list items', () => {
    const blocks = parseAssistantMarkdown(
      [
        '**ae-ideate 创作方向：**',
        '',
        '- 方向1：职场工具人',
        '- 方向2：学历光环',
        '',
        '**最小下一步推荐：** 请确认姓名',
      ].join('\n')
    );

    expect(blocks).toEqual([
      { type: 'heading', level: 3, text: 'ae-ideate 创作方向：' },
      { type: 'list', ordered: false, items: ['方向1：职场工具人', '方向2：学历光环'] },
      { type: 'paragraph', text: '**最小下一步推荐：** 请确认姓名' },
    ]);
    expect(parseAssistantMarkdownInline('**最小下一步推荐：** 请确认姓名')).toEqual([
      { type: 'strong', value: '最小下一步推荐：' },
      { type: 'text', value: ' 请确认姓名' },
    ]);
  });

  it('keeps plain paragraphs without markdown markers', () => {
    expect(parseAssistantMarkdown('我理解当前目标。\n\n为了避免歧义，请先确认主角姓名。')).toEqual([
      { type: 'paragraph', text: '我理解当前目标。' },
      { type: 'paragraph', text: '为了避免歧义，请先确认主角姓名。' },
    ]);
  });
});
