import React from 'react';

import { cn } from '@/shared/utils/class-names';

import { ASSISTANT_CHAT_SURFACE } from '../assistant-chat-surface';

export function AssistantChatBubble({
  role,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { role: 'user' | 'assistant' }) {
  return (
    <div
      data-testid={
        role === 'user' ? 'creative-assistant-user-message' : 'creative-assistant-assistant-message'
      }
      className={cn(
        role === 'user'
          ? ASSISTANT_CHAT_SURFACE.userBubble
          : ASSISTANT_CHAT_SURFACE.assistantBubble,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
