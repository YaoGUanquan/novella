const IMAGE_ACTION_PATTERN =
  /(生成|画|绘制|制作|调整|修改|改成|换成|重绘|再来一张|参考图|立绘|图片|图像)/u;

/** Only explicit visual actions trigger a paid image generation callback. */
export function isImageGenerationRequest(value: string): boolean {
  const normalized = value.trim();
  if (!normalized || !IMAGE_ACTION_PATTERN.test(normalized)) return false;
  return /(生成|画|绘制|制作|调整|修改|改成|换成|重绘|再来一张)/u.test(normalized);
}
