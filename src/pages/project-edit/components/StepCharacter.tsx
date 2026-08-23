/** Step 5: 角色一致性锁定与 AI 流式角色草稿。 */

import { ArrowRight, Check, Image as ImageIcon, Lock, ShieldCheck } from 'lucide-react';
import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';

import { toast } from '@/components/ui/toast';
import { useProject } from '@/core/hooks/useProject';
import type { Character } from '@/core/script/types/novel';
import { generateImage } from '@/core/services/ai/image/image-generation-service';
import { AICreativeAssistantSheet } from '@/features/creative-assistant';
import type { GeneratedImageAsset } from '@/features/creative-assistant/types';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';

import { useProjectEdit } from '../context/ProjectEditContext';
import { useStepCharacterContext } from '../context/selectors';

import {
  loadCharacterDrafts,
  loadOutlineDraft,
  saveCharacterDrafts,
  saveOutlineDraft,
} from './character-draft-persistence';
import {
  describeGeneratedImageAssetFailure,
  loadProjectImagePreview,
  releaseProjectImagePreview,
  storeGeneratedImage,
} from './generated-image-assets';
import {
  CHARACTER_CANDIDATE_INSTRUCTIONS,
  parsePlanningDrafts,
  type PlanningDraft,
} from './parse-character-drafts';

const CharacterDesigner = lazy(
  () => import('@/features/character-consistency/components/CharacterDesigner')
);

function CharacterReferenceImage({
  name,
  index,
  reference,
  projectId,
}: {
  name: string;
  index: number;
  reference: string;
  projectId?: string;
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    let loadedSource = '';
    setState('loading');
    setSource('');
    void loadProjectImagePreview(reference, projectId)
      .then((nextSource) => {
        loadedSource = nextSource;
        if (!active) {
          releaseProjectImagePreview(nextSource);
          return;
        }
        if (!nextSource) {
          setState('failed');
          return;
        }
        setSource(nextSource);
      })
      .catch(() => {
        if (active) setState('failed');
      });
    return () => {
      active = false;
      releaseProjectImagePreview(loadedSource);
    };
  }, [projectId, reference]);
  return (
    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border border-slate-700 bg-slate-900">
      {state === 'loading' && <span className="text-xs text-slate-400">加载中...</span>}
      {state === 'failed' ? (
        <span className="px-2 text-center text-xs text-rose-300">图片加载失败</span>
      ) : source ? (
        <img
          src={source}
          alt={`${name} 参考图 ${index + 1}`}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setState('ready')}
          onError={() => setState('failed')}
        />
      ) : null}
    </div>
  );
}

function StepCharacter() {
  const { content, characters, onChange, onContentChange, onSaveProject } =
    useStepCharacterContext();
  const { state: projectEditState } = useProjectEdit();
  const { project, setCurrentStep } = useProject();
  const projectId = project?.id ?? projectEditState.projectId;
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatedImageEvents, setGeneratedImageEvents] = useState<GeneratedImageAsset[]>([]);
  const [draftCharacters, setDraftCharactersState] = useState<Character[]>(() =>
    loadCharacterDrafts(projectId)
  );
  const [draftOutline, setDraftOutlineState] = useState(
    () => loadOutlineDraft(projectId) || content
  );

  useEffect(() => {
    setDraftCharactersState(loadCharacterDrafts(projectId));
    setDraftOutlineState(loadOutlineDraft(projectId) || content);
    setGeneratedImageEvents([]);
  }, [content, projectId]);

  const setDraftCharacters = useCallback(
    (next: Character[]) => {
      setDraftCharactersState(next);
      saveCharacterDrafts(projectId, next);
    },
    [projectId]
  );

  const resolveGeneratedImageUrl = useCallback(
    (image: GeneratedImageAsset) =>
      image.relativePath
        ? loadProjectImagePreview(image.relativePath, projectId)
        : image.previewUrl,
    [projectId]
  );

  const setDraftOutline = useCallback(
    (next: string) => {
      setDraftOutlineState(next);
      saveOutlineDraft(projectId, next);
    },
    [projectId]
  );

  const applyPlanningDraft = useCallback(
    (draft: PlanningDraft) => {
      if (draft.characters.length > 0) setDraftCharacters(draft.characters);
      if (draft.outline.trim()) setDraftOutline(draft.outline.trim());
    },
    [setDraftCharacters, setDraftOutline]
  );

  const updateCharacter = (id: string, patch: Partial<Character>): Character[] => {
    const next = characters.map((character) =>
      character.id === id ? { ...character, ...patch } : character
    );
    onChange(next);
    return next;
  };

  const handleConfirmCharacters = async (): Promise<boolean> => {
    const outline = draftOutline.trim();
    if (draftCharacters.length === 0 && !outline) {
      toast.warning('请先让 AI 生成角色或剧情大纲');
      return false;
    }
    if (draftCharacters.length > 0) onChange(draftCharacters);
    if (outline) onContentChange(outline);
    if (
      await onSaveProject({
        ...(draftCharacters.length > 0 ? { characters: draftCharacters } : {}),
        ...(outline ? { content: outline } : {}),
      })
    ) {
      toast.success(
        draftCharacters.length > 0 && outline
          ? '角色与剧情大纲已确认并写入当前项目'
          : outline
            ? '剧情大纲已确认并写入当前项目'
            : '角色草稿已确认并写入当前项目'
      );
      return true;
    }
    return false;
  };

  const handleManualCharacterSave = async (character: Character) => {
    const existingIndex = characters.findIndex((item) => item.id === character.id);
    const nextCharacters =
      existingIndex >= 0
        ? characters.map((item) => (item.id === character.id ? character : item))
        : [...characters, character];
    onChange(nextCharacters);
    if (await onSaveProject({ characters: nextCharacters })) {
      toast.success(`已保存角色「${character.name}」`);
    }
  };

  const handleGenerateReference = async (character: Character) => {
    setGeneratingId(character.id);
    try {
      const prompt = `角色立绘，${character.name}，${character.description ?? ''}，${character.personality ?? ''}，anime cinematic character reference sheet`;
      const result = await generateImage(prompt, { model: 'seedream-5.0', size: '2K' });
      const stored = await storeGeneratedImage(result, {
        projectId,
        filename: `${character.id}-${Date.now()}`,
      });
      const nextCharacters = updateCharacter(character.id, {
        consistency: {
          ...(character.consistency ?? {}),
          referenceImages: [
            ...(character.consistency?.referenceImages ?? []).filter(
              (reference) => reference !== stored.reference
            ),
            stored.reference,
          ],
        },
      });
      const image: GeneratedImageAsset = {
        id: `generated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prompt,
        previewUrl: stored.previewUrl,
        relativePath: stored.relativePath,
        mimeType: stored.mimeType,
        size: stored.size,
        createdAt: new Date().toISOString(),
      };
      setGeneratedImageEvents((items) => [...items, image]);
      const saved = await onSaveProject({ characters: nextCharacters });
      if (saved) {
        toast.success(
          stored.relativePath
            ? `已生成 ${character.name} 的参考图并保存到项目素材`
            : `已生成 ${character.name} 的参考图；浏览器模式仅保留临时地址`
        );
      } else {
        toast.warning('参考图已生成并显示，但项目保存失败，请使用顶部“保存修改”重试');
      }
    } catch (error) {
      toast.error(describeGeneratedImageAssetFailure(error));
    } finally {
      setGeneratingId(null);
    }
  };

  const handleAssistantImageGeneration = async (
    request: string,
    latestImage?: GeneratedImageAsset
  ): Promise<GeneratedImageAsset> => {
    const character =
      characters.find((item) => request.includes(item.name)) ??
      draftCharacters.find((item) => request.includes(item.name)) ??
      characters[0] ??
      draftCharacters[0];
    if (!character) throw new Error('请先创建或确认一个角色，再让助手生成参考图');
    const prompt = [
      `角色参考图，角色：${character.name}`,
      character.description,
      character.personality,
      latestImage ? `基于上一版需求继续调整：${latestImage.prompt}` : '',
      `本轮调整要求：${request}`,
      'anime cinematic character reference sheet',
    ]
      .filter(Boolean)
      .join('，');
    const result = await generateImage(prompt, { model: 'seedream-5.0', size: '2K' });
    const stored = await storeGeneratedImage(result, {
      projectId,
      filename: `${character.id}-${Date.now()}`,
    });
    const current = characters.find((item) => item.id === character.id) ?? character;
    const baseCharacters = characters.some((item) => item.id === current.id)
      ? characters
      : [...characters, current];
    const nextCharacters = baseCharacters.map((item) =>
      item.id === current.id
        ? {
            ...item,
            consistency: {
              ...(item.consistency ?? {}),
              referenceImages: [
                ...(item.consistency?.referenceImages ?? []).filter(
                  (reference) => reference !== stored.reference
                ),
                stored.reference,
              ],
            },
          }
        : item
    );
    onChange(nextCharacters);
    await onSaveProject({ characters: nextCharacters });
    return {
      id: `generated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prompt,
      previewUrl: stored.previewUrl,
      relativePath: stored.relativePath,
      mimeType: stored.mimeType,
      size: stored.size,
      createdAt: new Date().toISOString(),
    };
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
              <h3 className="m-0 text-lg font-bold text-slate-100">AI 策划设定草稿</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                助手根据角色生成剧情大纲和角色资料，回填到左侧后点保存才会写入项目。
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
            `项目正文：\n${content || '（空，请根据角色生成剧情大纲）'}`,
            characters.length ? `已确认角色：\n${JSON.stringify(characters)}` : '已确认角色：暂无',
            draftCharacters.length
              ? `待确认角色草稿：\n${JSON.stringify(draftCharacters)}`
              : '待确认角色草稿：暂无',
            draftOutline.trim() ? `待确认剧情大纲：\n${draftOutline}` : '待确认剧情大纲：暂无',
          ].join('\n\n')}
          candidateInstructions={CHARACTER_CANDIDATE_INSTRUCTIONS}
          parseCandidate={parsePlanningDrafts}
          onApply={applyPlanningDraft}
          autoPreviewCandidate
          persistLabel="保存角色与大纲"
          onPersist={() => handleConfirmCharacters()}
          onGenerateImage={handleAssistantImageGeneration}
          generatedImageEvents={generatedImageEvents}
          resolveGeneratedImageUrl={resolveGeneratedImageUrl}
        />
        {(draftOutline.trim() || draftCharacters.length > 0) && (
          <div className="space-y-3 rounded-xl border border-indigo-500/30 bg-slate-950 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-100">待确认剧情大纲</p>
                <p className="text-xs text-slate-400">
                  助手按角色生成后可直接改；点「保存角色与大纲」才会写入项目正文。
                </p>
              </div>
            </div>
            <Textarea
              value={draftOutline}
              onChange={(event) => setDraftOutline(event.target.value)}
              placeholder="助手会根据角色生成剧情大纲，也可在这里继续改"
              rows={8}
              aria-label="剧情大纲草稿"
            />
          </div>
        )}
        {draftCharacters.length > 0 && (
          <div className="space-y-3 rounded-xl border border-indigo-500/30 bg-slate-950 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-100">待确认角色草稿</p>
                <p className="text-xs text-slate-400">
                  已从对话回填，可改外观和服饰；草稿会自动保存。对话里点「保存角色与大纲」后才会写入已确认角色和项目正文。
                </p>
              </div>
              <Button onClick={() => void handleConfirmCharacters()}>
                <Check className="mr-1.5 h-4 w-4" />
                确认并保存
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
              可直接填写完整角色资料；AI
              助手回填草稿后会显示在上方并自动保存，确认保存前不会覆盖已确认角色。
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
                {character.consistency?.referenceImages?.length ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {character.consistency.referenceImages.map((reference, index) => {
                      return (
                        <CharacterReferenceImage
                          key={`${reference}-${index}`}
                          reference={reference}
                          projectId={projectId}
                          name={character.name}
                          index={index}
                        />
                      );
                    })}
                  </div>
                ) : null}
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
