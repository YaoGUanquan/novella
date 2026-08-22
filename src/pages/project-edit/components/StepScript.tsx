import { ArrowLeft, ArrowRight, Camera, Check, Film, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import { toast } from '@/components/ui/toast';
import { useProject } from '@/core/hooks/useProject';
import { AICreativeAssistantSheet } from '@/features/creative-assistant';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

import { useProjectEdit } from '../context/ProjectEditContext';
import { useStepStoryboardContext } from '../context/selectors';

type ShotDraft = {
  id: string;
  camera: string;
  composition: string;
  character: string;
  dialogue: string;
  prompt: string;
};

function parseShotDrafts(response: string): ShotDraft[] {
  const start = response.indexOf('[');
  const end = response.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('AI 回复尚未包含完整分镜 JSON');
  const parsed = JSON.parse(response.slice(start, end + 1)) as Array<Partial<ShotDraft>>;
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('AI 未返回可用分镜');
  return parsed.map((item, index) => ({
    id: `shot-${Date.now()}-${index}`,
    camera: item.camera ?? 'Medium',
    composition: item.composition ?? 'rule of thirds',
    character: item.character ?? '',
    dialogue: item.dialogue ?? '',
    prompt: item.prompt ?? '',
  }));
}

function StepScript() {
  const { project, setCurrentStep } = useProject();
  const { state } = useProjectEdit();
  const { onFramesChange, onSaveProject } = useStepStoryboardContext();
  const [shots, setShots] = useState<ShotDraft[]>([]);

  const updateShot = (id: string, patch: Partial<ShotDraft>) =>
    setShots((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const handleAddShot = () =>
    setShots((items) => [
      ...items,
      {
        id: `shot-${Date.now()}`,
        camera: 'Medium',
        composition: 'rule of thirds',
        character: '',
        dialogue: '',
        prompt: '',
      },
    ]);

  const handleConfirmShots = async () => {
    if (shots.length === 0) return toast.warning('请先完成 AI 分镜生成');
    onFramesChange(
      shots.map((shot, index) => ({
        id: shot.id,
        title: `分镜 ${index + 1}`,
        sceneDescription: shot.prompt,
        composition: shot.composition,
        cameraType: shot.camera,
        dialogue: shot.dialogue,
        duration: 5,
      }))
    );
    if (await onSaveProject()) toast.success('分镜草稿已写入当前项目');
  };

  return (
    <div className="space-y-6">
      <Card className="relative space-y-4 rounded-2xl border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/15 p-2.5 text-indigo-400">
              <Film className="h-6 w-6" />
            </div>
            <div>
              <h3 className="m-0 text-lg font-bold text-slate-100">脚本与分镜草稿</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                AI 会流式返回分镜草稿，确认后才进入后续图片和视频流程。
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={handleAddShot}>
              <Plus className="mr-1.5 h-4 w-4" />
              添加镜头
            </Button>
          </div>
        </div>
        <AICreativeAssistantSheet
          projectId={project?.id ?? state.projectId}
          targetLabel="分镜草稿"
          projectContext={[
            `项目名称：${project?.name ?? state.projectName ?? '未命名项目'}`,
            `项目简介：${project?.description ?? state.projectDescription ?? '未填写'}`,
            `视觉画风：${project?.artStyle ?? '未设置'}`,
            `目标画幅：${project?.aspectRatio ?? '未设置'}`,
            `项目正文：\n${state.content}`,
            state.characters.length
              ? `已确认角色：\n${JSON.stringify(state.characters)}`
              : '已确认角色：暂无',
          ].join('\n\n')}
          candidateInstructions={
            '只返回 3-12 个分镜的 JSON 数组，每项必须包含 camera、composition、character、dialogue、prompt；不要使用 Markdown 代码块。'
          }
          parseCandidate={parseShotDrafts}
          onApply={setShots}
        />
        {shots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center text-sm text-slate-400">
            尚无分镜草稿，请使用对话 AI 生成。
          </div>
        ) : (
          <div className="space-y-3">
            {shots.map((shot, index) => (
              <div
                key={shot.id}
                className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="border-indigo-500/30 bg-indigo-500/20 text-indigo-300">
                      SHOT #{index + 1}
                    </Badge>
                    <Badge variant="outline" className="border-slate-700 text-slate-300">
                      <Camera className="mr-1 h-3 w-3" />
                      {shot.camera}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShots((items) => items.filter((item) => item.id !== shot.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    value={shot.dialogue}
                    onChange={(event) => updateShot(shot.id, { dialogue: event.target.value })}
                    placeholder="对白或旁白"
                  />
                  <Input
                    value={shot.prompt}
                    onChange={(event) => updateShot(shot.id, { prompt: event.target.value })}
                    placeholder="画面生成提示词"
                  />
                  <Input
                    value={shot.camera}
                    onChange={(event) => updateShot(shot.id, { camera: event.target.value })}
                    placeholder="镜头类型"
                  />
                  <Input
                    value={shot.character}
                    onChange={(event) => updateShot(shot.id, { character: event.target.value })}
                    placeholder="出场角色"
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => void handleConfirmShots()}>
                <Check className="mr-1.5 h-4 w-4" />
                确认并写入分镜
              </Button>
            </div>
          </div>
        )}
      </Card>
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          上一步
        </Button>
        <Button variant="primary" onClick={() => setCurrentStep(3)}>
          下一步 <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default StepScript;
