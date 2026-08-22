/**
 * Step 4: AI 漫剧分镜绘制工坊 (StepStoryboard)
 * 封装 3 栏极客 Studio 工作台并集成前后步骤平滑导航
 */

import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import React, { Suspense, lazy } from 'react';

import { useProject } from '@/core/hooks/useProject';
import type { StoryboardFrame } from '@/core/storyboard/types/storyboard';
import { AICreativeAssistantSheet } from '@/features/creative-assistant';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { toast } from '@/shared/components/ui/toast';

import { useProjectEdit } from '../context/ProjectEditContext';
import { useStepStoryboardContext } from '../context/selectors';

const StoryboardEditor = lazy(() => import('@/features/storyboard/components/StoryboardEditor'));
const CollaborationPanel = lazy(() => import('./CollaborationPanel'));

function parseStoryboardDrafts(response: string): StoryboardFrame[] {
  const start = response.indexOf('[');
  const end = response.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('AI 回复尚未包含完整的分镜 JSON 数组');
  const parsed = JSON.parse(response.slice(start, end + 1)) as Array<Partial<StoryboardFrame>>;
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('AI 未返回可用的分镜');

  return parsed.map((item, index) => ({
    id: item.id || `frame_${Date.now()}_${index}`,
    title: item.title?.trim() || `分镜 ${index + 1}`,
    sceneDescription: item.sceneDescription ?? '',
    composition: item.composition ?? '',
    cameraType: item.cameraType ?? '',
    dialogue: item.dialogue ?? '',
    duration: Number.isFinite(item.duration) ? Number(item.duration) : 5,
  }));
}

function StepStoryboard() {
  const { state: projectEditState } = useProjectEdit();
  const {
    focusFrameId,
    content,
    storyAnalysis,
    characters,
    projectId,
    projectName,
    projectDescription,
  } = projectEditState;
  const {
    frames: storyboardFrames,
    onFramesChange,
    onFrameSelect,
    onBuildDraft,
  } = useStepStoryboardContext();
  const { project, setCurrentStep } = useProject();

  return (
    <div className="space-y-6">
      <Card className="relative space-y-4 rounded-2xl border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 m-0">
                阶段 2: 画面生成与 3 栏漫剧画幅大盘
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                漫剧分镜工作台：镜头卷轴、HD 16:9 画布视口与 AI 场景生图
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!storyAnalysis) {
                toast.warning('请先完成并确认内容分析，或使用分镜 AI 助手生成草稿');
                return;
              }
              onBuildDraft();
              toast.info('已根据已确认的内容分析生成分镜草案，可继续在下方编辑。');
            }}
          >
            根据已确认分析生成草案
          </Button>
        </div>

        <AICreativeAssistantSheet
          projectId={project?.id ?? projectId}
          targetLabel="分镜草案"
          projectContext={[
            `项目名称：${project?.name || projectName || '未命名项目'}`,
            `项目简介：${project?.description || projectDescription || '未填写'}`,
            `视觉画风：${project?.artStyle ?? '未设置'}`,
            `目标画幅：${project?.aspectRatio ?? '未设置'}`,
            `项目正文：\n${content}`,
            storyAnalysis
              ? `已确认剧情分析：\n${JSON.stringify(storyAnalysis)}`
              : '已确认剧情分析：暂无',
            characters.length ? `已确认角色：\n${JSON.stringify(characters)}` : '已确认角色：暂无',
            storyboardFrames.length
              ? `当前分镜：\n${JSON.stringify(storyboardFrames)}`
              : '当前分镜：暂无',
          ].join('\n\n')}
          candidateInstructions="只返回 JSON 数组，每项必须包含 title、sceneDescription、composition、cameraType、dialogue、duration；不要使用 Markdown 代码块。"
          parseCandidate={parseStoryboardDrafts}
          onApply={onFramesChange}
        />

        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <StoryboardEditor
            key={`${storyboardFrames.length}-${storyboardFrames[0]?.id || 'none'}`}
            initialFrames={storyboardFrames}
            focusFrameId={focusFrameId}
            onChange={onFramesChange}
            onFrameSelect={onFrameSelect}
          />
          <CollaborationPanel />
        </Suspense>
      </Card>

      {/* 底部步骤导航 */}
      <div className="flex justify-between items-center pt-2">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(0)}
          className="gap-1.5 font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> 上一步: 阶段 1 策划设定
        </Button>
        <Button
          variant="primary"
          onClick={() => setCurrentStep(2)}
          className="gap-1.5 font-bold cursor-pointer"
        >
          下一步: 阶段 3 动态合成 (运镜与转场) <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default StepStoryboard;
