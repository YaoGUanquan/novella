/**
 * 创作助手问答表面。底色和文字必须成套出现，避免浅字落到 Sheet 默认 bg-background 上。
 */
export const ASSISTANT_CHAT_SURFACE = {
  panel: '!bg-slate-950 !text-slate-100',
  assistantBubble: 'mr-5 rounded-lg border border-slate-600 !bg-slate-800 p-3 text-sm !text-white',
  userBubble: 'ml-8 rounded-lg border border-indigo-200 bg-white p-3 text-sm text-slate-900',
  notice: 'rounded border border-amber-300 bg-amber-100 p-3 text-amber-950',
  markdown: 'space-y-3 !bg-slate-800 text-sm !text-white',
  memory: 'space-y-2 rounded-lg border border-slate-600 !bg-slate-800 p-3 text-sm !text-white',
  muted: '!text-slate-300',
  inkOnDark: {
    label: 'text-[11px] leading-5 !text-slate-300',
    value: 'break-words text-sm leading-6 !text-white',
    title: 'text-xs font-semibold tracking-wide !text-white',
  },
  inkOnLight: {
    label: 'text-[11px] leading-5 text-amber-900',
    value: 'break-words text-sm leading-6 text-amber-950',
    title: 'text-xs font-semibold tracking-wide text-amber-950',
  },
} as const;
