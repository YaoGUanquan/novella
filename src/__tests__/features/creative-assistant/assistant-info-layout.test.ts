import {
  isInfoLabel,
  rowsFromAssistantState,
  rowsFromMemorySummary,
  splitInfoValues,
  tryParseInfoRows,
} from '@/features/creative-assistant/assistant-info-layout';
import { EMPTY_CREATIVE_ASSISTANT_MEMORY } from '@/features/creative-assistant/creative-assistant-memory';

describe('assistant info layout', () => {
  it('splits jammed confirmed facts on Chinese semicolons', () => {
    expect(splitInfoValues('项目名是股海浮沉；主角牛来是大学刚毕业的金融新兵')).toEqual([
      '项目名是股海浮沉',
      '主角牛来是大学刚毕业的金融新兵',
    ]);
  });

  it('treats character confirmation lines as info rows', () => {
    expect(
      tryParseInfoRows(['角色名称：牛来', '角色定位：主角', '性格：外冷内热；做事谨慎'].join('\n'))
    ).toEqual([
      { label: '角色名称', values: ['牛来'] },
      { label: '角色定位', values: ['主角'] },
      { label: '性格', values: ['外冷内热', '做事谨慎'] },
    ]);
  });

  it('does not treat generic numbered options as info rows', () => {
    expect(tryParseInfoRows('方向1：职场工具人\n方向2：学历光环')).toBeNull();
    expect(isInfoLabel('方向1')).toBe(false);
  });

  it('builds one row per confirmed fact instead of a joined paragraph', () => {
    expect(
      rowsFromAssistantState({
        intent: '完善角色',
        target: '角色设定',
        constraints: [],
        confirmedFacts: ['项目名是股海浮沉', '主角牛来是大学刚毕业的金融新兵'],
        openQuestions: ['转生后的年龄'],
        glossary: [{ term: '抱丹', meaning: '武学境界' }],
      })
    ).toEqual([
      { label: '意图', values: ['完善角色'] },
      { label: '已确认', values: ['项目名是股海浮沉', '主角牛来是大学刚毕业的金融新兵'] },
      { label: '待确认', values: ['转生后的年龄'] },
      { label: '术语', values: ['抱丹：武学境界'] },
    ]);
  });

  it('summarizes saved memory with the same row contract', () => {
    expect(
      rowsFromMemorySummary({
        ...EMPTY_CREATIVE_ASSISTANT_MEMORY,
        intent: '完善角色',
        confirmedFacts: ['主角是抱丹宗师', '项目名称是股海浮沉'],
        constraints: ['保留枪杀前世'],
        glossary: [{ term: '抱丹', meaning: '武学境界' }],
      })
    ).toEqual([
      { label: '意图', values: ['完善角色'] },
      { label: '已确认', values: ['主角是抱丹宗师', '项目名称是股海浮沉'] },
      { label: '约束', values: ['保留枪杀前世'] },
      { label: '术语', values: ['抱丹：武学境界'] },
    ]);
  });
});
