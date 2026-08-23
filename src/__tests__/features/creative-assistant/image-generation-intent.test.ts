import { isImageGenerationRequest } from '@/features/creative-assistant/image-generation-intent';

describe('isImageGenerationRequest', () => {
  it.each(['生成一张牛来的参考图', '把当前图片改成侧身', '再画一张角色立绘'])('%s', (input) => {
    expect(isImageGenerationRequest(input)).toBe(true);
  });

  it.each(['这张图片是什么风格', '角色设定需要补充什么', '参考图已经保存了吗'])('%s', (input) => {
    expect(isImageGenerationRequest(input)).toBe(false);
  });
});
