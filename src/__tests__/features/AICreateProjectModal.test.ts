import { aiService } from '@/core/services';
import { streamProjectInspiration } from '@/features/project/components/AICreateProjectModal';

jest.mock('@/core/services', () => ({
  aiService: { streamConfiguredDialogue: jest.fn() },
}));

describe('streamProjectInspiration', () => {
  it('passes project content and visual constraints without connection settings', () => {
    (aiService.streamConfiguredDialogue as jest.Mock).mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield '{}';
      },
    });

    streamProjectInspiration({
      projectName: '天下无敌',
      description: '武道宗师转生复仇',
      artStyle: '国风修仙',
      aspectRatio: '9:16',
    });

    expect(aiService.streamConfiguredDialogue).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('当前工程名称：天下无敌'),
        }),
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('视觉画风：国风修仙'),
        }),
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('目标画幅：9:16'),
        }),
      ]),
      { temperature: 0.9, max_tokens: 500 }
    );
    expect(
      JSON.stringify((aiService.streamConfiguredDialogue as jest.Mock).mock.calls[0][0])
    ).not.toContain('apiKey');
  });
});
