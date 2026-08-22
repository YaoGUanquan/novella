/**
 * ProjectDetail 页面 - Presenter 层
 * 项目详情/管理页面，包含小说/剧本/分镜/角色/渲染/合成/配音/成本/导出等功能
 */
import {
  ArrowLeft,
  Check,
  DollarSign,
  Download,
  Edit,
  FileText,
  Image,
  PlayCircle,
  Plus,
  Trash2,
  User,
  Volume2,
  Zap,
} from 'lucide-react';
import React, { Suspense, lazy, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { AudioEditorPanel } from '@/components/media/audio/AudioEditorPanel';
import { ExportPanel } from '@/components/project/ExportPanel';
import { AICreativeAssistantSheet } from '@/features/creative-assistant';
import { Button } from '@/shared/components/ui/button';
import Empty from '@/shared/components/ui/empty';
import { Spin } from '@/shared/components/ui/spin';
import { Tabs, TabPane } from '@/shared/components/ui/tabs';
import type { Character } from '@/shared/types/novel';
import type { VideoSegment } from '@/shared/types/script';

import { createScriptDraft } from './hooks/projectDetailActions';
import { useProjectDetail } from './hooks/useProjectDetail';

const importScriptEditor = () => import('@/features/storyboard/components/ScriptEditor');
const importRenderCenter = () => import('@/features/rendering/components/RenderCenter');
const importCharacterDesigner = () =>
  import('@/features/character-consistency/components/CharacterDesigner');
const importCompositionStudio = () => import('@/features/composition/components/CompositionStudio');

const ScriptEditor = lazy(importScriptEditor);
const RenderCenter = lazy(importRenderCenter);
const CharacterDesigner = lazy(importCharacterDesigner);
const CompositionStudio = lazy(importCompositionStudio);

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const {
    loading,
    project,
    activeScript,
    scriptDraft,
    activeTab,
    storyboardFrames,
    exportQualityGate,
    setActiveTab,
    setScriptDraft,
    handleApplyRenderedFrame,
    handleScriptChange,
    handleConfirmScriptDraft,
    handleDeleteProject,
    persistProjectPatch,
    preloadTabModules,
  } = useProjectDetail({ projectId: projectId ?? '' });

  useEffect(() => {
    preloadTabModules(activeTab);
  }, [preloadTabModules, activeTab]);

  const handleEditClick = () => navigate(`/project/edit/${projectId}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--muted-foreground)]">
        <Spin size="large" tip="正在加载 Novella 漫剧工程大厅..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center rounded-2xl bg-[var(--card)] border border-[var(--border)] max-w-lg mx-auto my-12 space-y-4">
        <Empty description="未找到指定的漫剧工程数据" />
        <Button onClick={() => navigate('/')}>返回首页工作台</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 Top Toolbar */}
      <div className="flex items-center justify-between p-5 rounded-3xl bg-[var(--card)] border border-[var(--border)] backdrop-blur-2xl shadow-xl flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">{project.name}</h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              {project.description || 'Novella 4K 漫剧视听项目'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleEditClick}
            className="bg-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/80 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20"
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            编辑工程
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteProject}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            删除
          </Button>
        </div>
      </div>

      {/* 选项卡面板大厅 */}
      <div className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] backdrop-blur-2xl shadow-xl">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="剧本拆解与分镜" key="novel">
            <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 p-4">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">项目内容驱动脚本</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {project.content || project.novelText || project.script
                    ? '基于当前正文生成草稿，确认后才会写入项目。'
                    : '请先导入小说或剧本文本。'}
                </p>
              </div>
              <AICreativeAssistantSheet
                projectId={project.id}
                targetLabel="脚本草稿"
                projectContext={[
                  `项目名称：${project.name}`,
                  `项目简介：${project.description || '未填写'}`,
                  `视觉画风：${project.artStyle ?? '未设置'}`,
                  `目标画幅：${project.aspectRatio ?? '未设置'}`,
                  `项目正文：\n${(activeScript?.content || project.content || project.novelText || project.script || '').trim()}`,
                  project.characters?.length
                    ? `已确认角色：\n${JSON.stringify(project.characters)}`
                    : '已确认角色：暂无',
                  project.storyAnalysis
                    ? `已确认剧情分析：\n${JSON.stringify(project.storyAnalysis)}`
                    : '已确认剧情分析：暂无',
                ].join('\n\n')}
                candidateInstructions="直接返回可用于漫剧分镜的中文脚本正文。保留人物、冲突与关键动作，每个场景单独一行；不要使用 Markdown、JSON 或解释文字。"
                parseCandidate={(content) => {
                  const draft = content.trim();
                  if (!draft) throw new Error('AI 未返回可用的脚本正文');
                  return createScriptDraft(project.name, draft);
                }}
                onApply={setScriptDraft}
              />
            </div>
            {scriptDraft && (
              <div className="mb-4 space-y-3 rounded-xl border border-cyan-500/40 bg-cyan-500/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">AI 脚本草稿</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      当前内容尚未覆盖已确认脚本。
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleConfirmScriptDraft}>
                      <Check className="mr-1 h-4 w-4" />
                      确认并保存
                    </Button>
                  </div>
                </div>
                <textarea
                  value={scriptDraft.content}
                  onChange={(event) =>
                    setScriptDraft({
                      ...scriptDraft,
                      content: event.target.value,
                    })
                  }
                  className="min-h-32 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)]"
                  aria-label="AI 脚本草稿"
                />
              </div>
            )}
            <Suspense fallback={<Spin tip="正在载入剧本编辑器..." />}>
              <ScriptEditor
                segments={(activeScript?.segments as unknown as VideoSegment[]) || []}
                onSegmentsChange={(segs) => handleScriptChange(segs as any)}
              />
            </Suspense>
          </TabPane>

          <TabPane tab="角色一致性设计" key="character">
            <Suspense fallback={<Spin tip="正在载入角色设计器..." />}>
              <CharacterDesigner
                characters={(activeScript as any)?.characters || []}
                onChange={(chars) => {
                  if (activeScript) {
                    handleScriptChange({ ...activeScript, characters: chars } as any);
                  }
                }}
              />
            </Suspense>
          </TabPane>

          <TabPane tab="画面与场景渲染" key="render">
            <Suspense fallback={<Spin tip="正在载入 4K 渲染中心..." />}>
              <RenderCenter
                frames={storyboardFrames}
                projectId={projectId}
                onApplyRenderedFrame={handleApplyRenderedFrame}
              />
            </Suspense>
          </TabPane>

          <TabPane tab="视听极速合成" key="composition">
            <Suspense fallback={<Spin tip="正在载入合成大厅..." />}>
              <CompositionStudio frames={storyboardFrames} />
            </Suspense>
          </TabPane>

          <TabPane tab="配音与音效" key="audio">
            <AudioEditorPanel project={project} onPersistPatch={persistProjectPatch} />
          </TabPane>

          <TabPane tab="4K 完工导出" key="export">
            <ExportPanel
              projectId={projectId ?? ''}
              qualityGate={exportQualityGate}
              onNavigateToEdit={handleEditClick}
            />
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectDetail;
