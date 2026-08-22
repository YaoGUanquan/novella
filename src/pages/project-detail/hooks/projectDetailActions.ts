/**
 * ProjectDetail 操作方法
 *
 * 设计：纯函数工厂，接收依赖参数返回 useCallback。
 * 不是 Hook，不遵守 Hook 规则，方便主 hook 编排依赖链。
 */
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { toast } from '@/components/ui/toast';
import type { ProjectData } from '@/core/project/types/project';
import type { Script, ScriptSegment, VideoSegment } from '@/core/script/types/script';
import {
  aiService,
  collaborationService,
  costService,
  reviewExportService,
  tauriService,
} from '@/core/services';
import type { EvaluationScores } from '@/core/services';
import { parseScriptSegments } from '@/core/services/ai/text/ai-mock-data';
import type { StoryboardFrame } from '@/core/storyboard/types/storyboard';
import { handleAsyncError } from '@/core/utils/async';
import { logger } from '@/core/utils/logger';

// ─── 持久化 ───

/** 持久化项目补丁到 store + 文件 */
export function usePersistProjectPatch(
  project: ProjectData | null,
  setProject: React.Dispatch<React.SetStateAction<ProjectData | null>>,
  updateProject: (id: string, data: ProjectData) => void
) {
  return useCallback(
    (patch: Partial<ProjectData>) => {
      if (!project) return;
      const updatedProject = {
        ...project,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      setProject(updatedProject);
      updateProject(updatedProject.id, updatedProject);
      tauriService.writeText(updatedProject.id, JSON.stringify(updatedProject)).catch((err) => {
        logger.error('持久化项目失败:', err);
        toast.error('保存失败，请重试');
      });
    },
    [project, setProject, updateProject]
  );
}

// ─── 帧操作 ───

/** 应用渲染后的帧图片 */
export function useHandleApplyRenderedFrame(
  project: ProjectData | null,
  storyboardFrames: StoryboardFrame[],
  persistProjectPatch: (patch: Partial<ProjectData>) => void
) {
  return useCallback(
    (frameId: string, imageUrl: string) => {
      if (!project) return;
      const updatedFrames = storyboardFrames.map((frame) =>
        frame.id === frameId ? { ...frame, imageUrl } : frame
      );
      persistProjectPatch({ storyboardFrames: updatedFrames });
    },
    [project, storyboardFrames, persistProjectPatch]
  );
}

// ─── 评审导出 ───

/** 导出评审记录 */
export function useHandleExportReviewNotes(
  project: ProjectData | null,
  storyboardFrames: StoryboardFrame[],
  evaluationSummary: EvaluationScores | undefined
) {
  return useCallback(async () => {
    if (!project?.id) return;
    try {
      const projectComments = collaborationService.listComments(project.id);
      const projectVersions = collaborationService.listVersions(project.id);
      const projectCostStats = costService.getProjectStats(project.id);
      const projectCostRecords = costService.getRecords(project.id).slice(0, 30);
      const content = reviewExportService.toMarkdown({
        project: {
          id: project.id,
          name: project.name,
          storyboardFrameCount: storyboardFrames.length,
        },
        comments: projectComments,
        versions: projectVersions,
        costStats: projectCostStats,
        costRecords: projectCostRecords,
        evaluationSummary,
      });
      const saved = await reviewExportService.saveMarkdownToFile(
        `${project.name}_评审记录.md`,
        content,
        { projectId: project.id, projectName: project.name, source: 'project_detail' }
      );
      if (saved) toast.success('评审记录导出成功');
    } catch (error) {
      handleAsyncError(error, '导出评审记录失败');
    }
  }, [project, storyboardFrames.length, evaluationSummary]);
}

// ─── 剧本操作 ───

/** 创建新剧本 */
export function useHandleCreateScript(
  project: ProjectData | null,
  setProject: React.Dispatch<React.SetStateAction<ProjectData | null>>,
  setActiveScript: React.Dispatch<React.SetStateAction<Script | null>>,
  updateProject: (id: string, data: ProjectData) => void
) {
  return useCallback(() => {
    if (!project) return;
    try {
      const newScript: Script = {
        id: uuidv4(),
        title: '新剧本',
        content: '',
        segments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedProject = {
        ...project,
        scripts: [...(project.scripts ?? []), newScript],
        updatedAt: new Date().toISOString(),
      };
      setProject(updatedProject);
      setActiveScript(newScript);
      toast.loading('正在保存剧本...');
      tauriService
        .writeText(updatedProject.id, JSON.stringify(updatedProject))
        .then(() => {
          updateProject(updatedProject.id, updatedProject);
          toast.success('剧本创建成功');
        })
        .catch((error) => {
          logger.error('保存项目文件失败:', error);
          toast.error('保存项目文件失败: ' + (error instanceof Error ? error.message : '未知错误'));
          setProject(project);
          setActiveScript(project.scripts?.[0] ?? null);
        });
    } catch (error) {
      handleAsyncError(error, '创建剧本失败');
    }
  }, [project, setProject, setActiveScript, updateProject]);
}

export function useHandleGenerateScript(
  project: ProjectData | null,
  activeScript: Script | null,
  setScriptDraft: React.Dispatch<React.SetStateAction<Script | null>>,
  setGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  controllerRef: React.MutableRefObject<AbortController | null>
) {
  return useCallback(
    async (creativeBrief = '') => {
      if (!project) return;
      const source = (
        activeScript?.content ||
        project.content ||
        project.novelText ||
        project.script ||
        ''
      ).trim();
      if (!source) {
        toast.warning('请先导入小说或剧本文本');
        return;
      }
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const now = new Date().toISOString();
      const draftId = `draft_${uuidv4()}`;
      const instruction = creativeBrief.trim();
      let generated = '';
      setGenerating(true);
      setScriptDraft({
        id: draftId,
        title: `${project.name} AI 脚本草稿`,
        content: '',
        segments: [],
        createdAt: now,
        updatedAt: now,
        modelUsed: 'gpt-5.6-sol',
      });
      try {
        toast.info('AI 正在流式生成脚本草稿...');
        const prompt = `${activeScript ? '请优化以下现有脚本' : '请将以下项目内容改写为可用于漫剧分镜的中文脚本'}。保留人物、冲突和关键动作，每个场景单独一行，直接输出脚本正文，不要解释。${instruction ? `\n\n用户创作要求：${instruction}` : ''}\n\n项目内容：\n${source.slice(0, 16000)}`;
        for await (const chunk of aiService.streamGenerate(prompt, {
          model: 'gpt-5.6-sol',
          provider: 'openai',
          signal: controller.signal,
        })) {
          if (controller.signal.aborted) break;
          generated += chunk;
          setScriptDraft((draft) =>
            draft?.id === draftId
              ? {
                  ...draft,
                  content: generated,
                  segments: parseScriptSegments(generated),
                  updatedAt: new Date().toISOString(),
                }
              : draft
          );
        }
        if (!controller.signal.aborted) toast.success('脚本草稿已生成，请确认后保存');
      } catch (error) {
        if (controller.signal.aborted) {
          toast.info('已停止生成，已收到的脚本草稿仍可继续编辑');
        } else {
          logger.error('AI 脚本草稿生成失败:', error);
          toast.error(error instanceof Error ? error.message : 'AI 脚本生成失败');
        }
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setGenerating(false);
        }
      }
    },
    [project, activeScript, setScriptDraft, setGenerating, controllerRef]
  );
}

export function createScriptDraft(projectName: string, content: string): Script {
  const now = new Date().toISOString();
  return {
    id: `draft_${uuidv4()}`,
    title: `${projectName} AI 脚本草稿`,
    content,
    segments: parseScriptSegments(content),
    createdAt: now,
    updatedAt: now,
    modelUsed: 'gpt-5.6-sol',
  };
}

export function useHandleConfirmScriptDraft(
  project: ProjectData | null,
  draft: Script | null,
  setProject: React.Dispatch<React.SetStateAction<ProjectData | null>>,
  setActiveScript: React.Dispatch<React.SetStateAction<Script | null>>,
  setScriptDraft: React.Dispatch<React.SetStateAction<Script | null>>,
  updateProject: (id: string, data: ProjectData) => void
) {
  return useCallback(() => {
    if (!project || !draft) return;
    const confirmedDraft: Script = {
      ...draft,
      segments: parseScriptSegments(draft.content),
      updatedAt: new Date().toISOString(),
    };
    const updatedProject: ProjectData = {
      ...project,
      scripts: [
        ...(project.scripts ?? []).filter((script) => script.id !== confirmedDraft.id),
        confirmedDraft,
      ],
      script: confirmedDraft.content,
      updatedAt: new Date().toISOString(),
    };
    setProject(updatedProject);
    setActiveScript(confirmedDraft);
    setScriptDraft(null);
    updateProject(updatedProject.id, updatedProject);
    tauriService.writeText(updatedProject.id, JSON.stringify(updatedProject)).catch((error) => {
      logger.error('脚本草稿持久化失败:', error);
      toast.error('脚本已更新到当前页面，但文件持久化失败');
    });
    toast.success('脚本草稿已确认并保存');
  }, [project, draft, setProject, setActiveScript, setScriptDraft, updateProject]);
}

/** 脚本内容变更处理 */
export function useHandleScriptChange(
  project: ProjectData | null,
  activeScript: Script | null,
  setProject: React.Dispatch<React.SetStateAction<ProjectData | null>>,
  setActiveScript: React.Dispatch<React.SetStateAction<Script | null>>,
  updateProject: (id: string, data: ProjectData) => void
) {
  return useCallback(
    (segments: VideoSegment[]) => {
      if (!project || !activeScript) return;
      try {
        const updatedScript: Script = {
          ...activeScript,
          segments: segments.map((seg) => ({
            id: seg.id,
            startTime: seg.start,
            endTime: seg.end,
            content: seg.content ?? '',
            type: seg.type as 'narration' | 'dialogue' | 'action' | 'transition',
          })),
          updatedAt: new Date().toISOString(),
        };
        const existingScripts = project.scripts ?? [];
        const containsActiveScript = existingScripts.some(
          (script) => script.id === activeScript.id
        );
        const updatedScripts = containsActiveScript
          ? existingScripts.map((script: Script) =>
              script.id === activeScript.id ? updatedScript : script
            )
          : [...existingScripts, updatedScript];
        const updatedProject = {
          ...project,
          scripts: updatedScripts,
          script: updatedScript.content,
          updatedAt: new Date().toISOString(),
        };
        setProject(updatedProject);
        setActiveScript(updatedScript);
        tauriService
          .writeText(updatedProject.id, JSON.stringify(updatedProject))
          .then(() => {
            updateProject(updatedProject.id, updatedProject);
            toast.success('脚本内容已保存');
          })
          .catch((error) => {
            logger.error('保存项目文件失败:', error);
            toast.error(
              '保存项目文件失败: ' + (error instanceof Error ? error.message : '未知错误')
            );
            setProject(project);
            setActiveScript(activeScript);
          });
      } catch (error) {
        handleAsyncError(error, '更新脚本内容失败');
      }
    },
    [project, activeScript, setProject, setActiveScript, updateProject]
  );
}

/** 导出剧本 */
export function useHandleExportScript(project: ProjectData | null, activeScript: Script | null) {
  return useCallback(async () => {
    if (!project || !activeScript) {
      toast.warning('没有可导出的剧本');
      return;
    }
    try {
      const scriptContent =
        activeScript.segments
          ?.map((segment: ScriptSegment, index: number) => {
            return `【第${index + 1}幕】\n${segment.content ?? ''}\n`;
          })
          .join('\n') ?? '';
      const { invoke } = await import('@tauri-apps/api/core');
      const filePath = await invoke<string>('save_file_dialog', {
        defaultPath: `${project.name}_剧本.txt`,
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
      });
      if (filePath) {
        await invoke('write_text_file', { path: filePath, content: scriptContent });
        toast.success('剧本导出成功');
      }
    } catch (error) {
      handleAsyncError(error, '导出剧本失败');
    }
  }, [project, activeScript]);
}
