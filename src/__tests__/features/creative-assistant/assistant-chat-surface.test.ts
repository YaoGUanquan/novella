import { ASSISTANT_CHAT_SURFACE } from '@/features/creative-assistant/assistant-chat-surface';

function hasPairedContrast(className: string): void {
  const hasDarkSurface = /(?:^|\s)(?:!)?bg-slate-(?:800|900|950)(?:\s|$)/.test(className);
  const hasLightText = /(?:^|\s)(?:!)?text-(?:white|slate-50|slate-100)(?:\s|$)/.test(className);
  const hasLightSurface = /(?:^|\s)(?:!)?bg-(?:white|amber-50|amber-100)(?:\s|$)/.test(className);
  const hasDarkText = /(?:^|\s)(?:!)?text-(?:slate-900|slate-950|amber-950)(?:\s|$)/.test(
    className
  );
  expect(hasDarkSurface || hasLightSurface).toBe(true);
  if (hasDarkSurface) expect(hasLightText).toBe(true);
  if (hasLightSurface) expect(hasDarkText).toBe(true);
}

describe('assistant chat surface tokens', () => {
  it('pairs every chat surface with readable text instead of light-on-light', () => {
    hasPairedContrast(ASSISTANT_CHAT_SURFACE.panel);
    hasPairedContrast(ASSISTANT_CHAT_SURFACE.assistantBubble);
    hasPairedContrast(ASSISTANT_CHAT_SURFACE.userBubble);
    hasPairedContrast(ASSISTANT_CHAT_SURFACE.notice);
    hasPairedContrast(ASSISTANT_CHAT_SURFACE.markdown);
    hasPairedContrast(ASSISTANT_CHAT_SURFACE.memory);
  });

  it('keeps assistant reply text on a dark surface so Sheet bg-background cannot wash it out', () => {
    expect(ASSISTANT_CHAT_SURFACE.assistantBubble).toMatch(/!bg-slate-800/);
    expect(ASSISTANT_CHAT_SURFACE.assistantBubble).toMatch(/!text-white/);
    expect(ASSISTANT_CHAT_SURFACE.markdown).toMatch(/!text-white/);
  });

  it('gives project memory a dark surface with forced light text instead of indigo-on-navy', () => {
    expect(ASSISTANT_CHAT_SURFACE.memory).toMatch(/!bg-slate-800/);
    expect(ASSISTANT_CHAT_SURFACE.memory).toMatch(/!text-white/);
    expect(ASSISTANT_CHAT_SURFACE.memory).not.toMatch(/indigo-500\/5/);
    expect(ASSISTANT_CHAT_SURFACE.inkOnDark.label).toMatch(/!text-slate-300/);
    expect(ASSISTANT_CHAT_SURFACE.inkOnDark.value).toMatch(/!text-white/);
  });
});
