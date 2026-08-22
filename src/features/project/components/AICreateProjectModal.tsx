import { aiService } from '@/core/services';
import {
  CreateProjectModal,
  type CreateProjectModalProps,
  type InspirationContext,
} from '@/shared/components/project/CreateProjectModal';

export function streamProjectInspiration(context: InspirationContext): AsyncIterable<string> {
  return aiService.streamConfiguredDialogue(
    [
      {
        role: 'system',
        content:
          '你是中文漫剧项目策划助手。根据用户当前的创作约束生成一个新颖、可执行的工程标题和剧情概要。只返回严格 JSON，不要 Markdown 或解释文字，格式为 {"name":"...","description":"..."}。',
      },
      {
        role: 'user',
        content: [
          `当前工程名称：${context.projectName || '未填写，请生成'}`,
          `当前剧情概要：${context.description || '未填写，请生成'}`,
          `视觉画风：${context.artStyle}`,
          `目标画幅：${context.aspectRatio}`,
          '请保留已有创作意图；信息不足时补全一个适合该画风和画幅的漫剧灵感。',
        ].join('\n'),
      },
    ],
    { temperature: 0.9, max_tokens: 500 }
  );
}

export function AICreateProjectModal(props: CreateProjectModalProps) {
  return <CreateProjectModal {...props} generateInspiration={streamProjectInspiration} />;
}

export default AICreateProjectModal;
