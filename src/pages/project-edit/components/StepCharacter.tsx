/** Step 5: 角色一致性锁定与 AI 流式角色草稿。 */

import { ArrowRight, Check, Image as ImageIcon, Lock, ShieldCheck } from 'lucide-react';
import React, { Suspense, lazy, useState } from 'react';

import { toast } from '@/components/ui/toast';
import { useProject } from '@/core/hooks/useProject';
import type { Character } from '@/core/script/types/novel';
import { generateImage } from '@/core/services/ai/image/image-generation-service';
import { AICreativeAssistantSheet } from '@/features/creative-assistant';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';

import { useProjectEdit } from '../context/ProjectEditContext';
import { useStepCharacterContext } from '../context/selectors';

import { CHARACTER_CANDIDATE_INSTRUCTIONS, parseCharacterDrafts } from './parse-character-drafts';

const CharacterDesigner = lazy(
  () => import('@/features/character-consistency/components/CharacterDesigner')
);

function StepCharacter() {
  const { content, characters, onChange, onSaveProject } = useStepCharacterContext();
  const { state: projectEditState } = useProjectEdit();
  const { project, setCurrentStep } = useProject();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [draftCharacters, setDraftCharacters] = useState<Character[]>([]);

  const updateCharacter = (id: string, patch: Partial<Character>) => {
    onChange(
      characters.map((character) => (character.id === id ? { ...character, ...patch } : character))
    );
  };

  const handleConfirmCharacters = async () => {
    if (draftCharacters.length === 0) return toast.warning('请先完成 AI 角色生成');
    onChange(draftCharacters);
    if (await onSaveProject({ characters: draftCharacters })) {
      toast.success('角色草稿已确认并写入当前项目');
    }
  };

  const handleManualCharacterSave = (character: Character) => {
    const existingIndex = characters.findIndex((item) => item.id === character.id);
    const nextCharacters =
      existingIndex >= 0
        ? characters.map((item) => (item.id === character.id ? character : item))
        : [...characters, character];
    onChange(nextCharacters);
    toast.success(`已添加手动角色「${character.name}」，请使用页面顶部“保存修改”写入工程。`);
  };

  const handleGenerateReference = async (character: Character) => {
    setGeneratingId(character.id);
    try {
      const result = await generateImage(
        `角色立绘，${character.name}，${character.description ?? ''}，${character.personality ?? ''}，anime cinematic character reference sheet`,
        { model: 'seedream-5.0', size: '2K' }
      );
      updateCharacter(character.id, {
        consistency: {
          ...(character.consistency ?? {}),
          referenceImages: [
            ...(character.consistency?.referenceImages ?? []).filter((url) => url !== result.url),
            result.url,
          ],
        },
      });
      toast.success(`已生成 ${character.name} 的参考图`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '角色参考图生成失败');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="relative space-y-4 rounded-2xl border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/15 p-2.5 text-indigo-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="m-0 text-lg font-bold text-slate-100">AI 角色设定草稿</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                AI 会根据项目正文流式提取角色，确认后才替换已保存的角色设定。
              </p>
            </div>
          </div>
        </div>
        <AICreativeAssistantSheet
          projectId={project?.id ?? projectEditState.projectId}
          targetLabel="角色设定"
          projectContext={[
            `项目名称：${project?.name ?? projectEditState.projectName ?? '未命名项目'}`,
            `项目简介：${project?.description ?? projectEditState.projectDescription ?? '未填写'}`,
            `视觉画风：${project?.artStyle ?? '未设置'}`,
            `目标画幅：${project?.aspectRatio ?? '未设置'}`,
            `项目正文：\n${content}`,
            characters.length ? `已确认角色：\n${JSON.stringify(characters)}` : '已确认角色：暂无',
          ].join('\n\n')}
          candidateInstructions={CHARACTER_CANDIDATE_INSTRUCTIONS}
          parseCandidate={parseCharacterDrafts}
          onApply={setDraftCharacters}
          autoPreviewCandidate
          persistLabel="保存角色"
          onPersist={() => void handleConfirmCharacters()}
        />
        {draftCharacters.length > 0 && (
          <div className="space-y-3 rounded-xl border border-indigo-500/30 bg-slate-950 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-100">待确认角色草稿</p>
                <p className="text-xs text-slate-400">
                  已从对话回填，可改外观和服饰；对话里点「保存角色」后才会写入已确认角色。
                </p>
              </div>
              <Button onClick={() => void handleConfirmCharacters()}>
                <Check className="mr-1.5 h-4 w-4" />
                确认并保存角色
              </Button>
            </div>
            <CharacterDesigner
              characters={draftCharacters}
              character={draftCharacters[0]}
              onChange={setDraftCharacters}
            />
          </div>
        )}
      </Card>

      {draftCharacters.length === 0 && (
        <Card className="border-slate-800 bg-slate-900/90 p-6 shadow-xl">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-100">手动创建角色</h3>
            <p className="mt-1 text-xs text-slate-400">
              可直接填写完整角色资料；AI 助手回填草稿后会显示在上方，确认保存前不会覆盖已确认角色。
            </p>
          </div>
          <Suspense
            fallback={
              <div className="py-8 text-center text-sm text-slate-400">正在加载角色表单...</div>
            }
          >
            <CharacterDesigner onSave={handleManualCharacterSave} />
          </Suspense>
        </Card>
      )}

      {characters.length > 0 && (
        <Card className="border-slate-800 bg-slate-900/90 p-6 shadow-xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-100">已确认角色与参考图</h3>
              <p className="text-xs text-slate-400">
                已确认数据可继续编辑，并可按当前图像配置生成角色参考图。
              </p>
            </div>
            <Badge className="border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
              <Lock className="mr-1 h-3.5 w-3.5" />
              角色一致性已锁定
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {characters.map((character) => (
              <div
                key={character.id}
                className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <Input
                  value={character.name}
                  onChange={(event) => updateCharacter(character.id, { name: event.target.value })}
                  aria-label={`${character.name} 角色名称`}
                />
                <Textarea
                  value={character.description ?? ''}
                  onChange={(event) =>
                    updateCharacter(character.id, { description: event.target.value })
                  }
                  placeholder="角色描述"
                  rows={3}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">
                    {character.consistency?.referenceImages?.length ?? 0} 张参考图
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={generatingId === character.id}
                    onClick={() => void handleGenerateReference(character)}
                  >
                    <ImageIcon className="mr-1.5 h-4 w-4" />
                    {generatingId === character.id ? '生成中...' : '生成参考图'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between pt-2">
        <div />
        <Button
          variant="primary"
          onClick={() => setCurrentStep(1)}
          className="cursor-pointer gap-1.5 font-bold"
        >
          下一步: 阶段 2 画面生成 (分镜大盘) <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default StepCharacter;
