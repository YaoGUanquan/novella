/**
 * ProjectEditProvider — Page-level state container for the project edit workflow.
 *
 * State management + actions extracted to useProjectEditActions.ts.
 * This file is now lean: just wires state setters to the actions hook
 * and exposes the context value.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import type { AudioTrackConfig } from '@/core/audio/types/audio';
import type { CompositionProject } from '@/core/audio/types/composition';
import { useProject } from '@/core/hooks/useProject';
import type { Character, StoryAnalysis } from '@/core/script/types/novel';
import { collaborationService } from '@/core/services';
import type { FrameComment, StoryboardVersion } from '@/core/services/domain/collaboration-service';
import type { StoryboardFrame } from '@/core/storyboard/types/storyboard';
import type { ScriptImportMetadata } from '@/features/storyboard/components/NovelImporter';
import { useStoryboard } from '@/stores/storyboard/storyboard-store';

import { initialProjectEditState, type ProjectEditContextValue } from './project-edit-state';
import { useProjectEditActions } from './useProjectEditActions';

export type { ProjectEditContextValue } from './project-edit-state';

export const ProjectEditContext = createContext<ProjectEditContextValue | null>(null);

export function useProjectEdit(): ProjectEditContextValue {
  const ctx = useContext(ProjectEditContext);
  if (!ctx) {
    throw new Error('useProjectEdit must be used within ProjectEditProvider');
  }
  return ctx;
}

export interface ProviderProps {
  children: React.ReactNode;
  projectMetadata: {
    name: string;
    description: string;
    exportPreset: '9:16' | '16:9' | '1:1';
    exportSettings: Record<string, unknown>;
  };
  initialFocusFrameId?: string;
  projectId?: string;
  initialData?: {
    content?: string;
    novelMetadata?: ScriptImportMetadata | null;
    storyAnalysis?: StoryAnalysis | null;
    audioConfig?: AudioTrackConfig;
    characters?: Character[];
    composition?: CompositionProject | null;
    script?: string;
    storyboardFrames?: unknown[];
    storyboardComments?: unknown[];
    storyboardVersions?: unknown[];
    initialStep?: number;
  } | null;
}

export function ProjectEditProvider({
  children,
  projectMetadata,
  initialFocusFrameId,
  projectId,
  initialData,
}: ProviderProps) {
  const [, startTransition] = useTransition();
  const { project, setSaving, setCurrentStep, updateProject } = useProject();
  const storyboard = useStoryboard();
  const {
    setComments: setStoryboardComments,
    setFrames: setStoryboardFrames,
    setVersions: setStoryboardVersions,
  } = storyboard;
  const effectiveProjectId = project?.id ?? projectId;
  const hydratedDataKeyRef = useRef<string | null>(null);

  // ─── State ────────────────────────────────────────────────────────────────
  const [content, setContent] = useState(initialData?.content ?? initialProjectEditState.content);
  const [novelMetadata, setNovelMetadata] = useState<ScriptImportMetadata | null>(
    initialData?.novelMetadata ?? initialProjectEditState.novelMetadata
  );
  const [loading, setLoading] = useState(initialProjectEditState.loading);
  const [storyAnalysis, setStoryAnalysis] = useState<StoryAnalysis | null>(
    initialData?.storyAnalysis ?? initialProjectEditState.storyAnalysis
  );
  const [analysisDraft, setAnalysisDraft] = useState(
    (initialData?.storyAnalysis ? JSON.stringify(initialData.storyAnalysis, null, 2) : '') ||
      initialProjectEditState.analysisDraft
  );
  const [analysisState, setAnalysisState] = useState<'idle' | 'generated' | 'accepted'>(
    initialData?.storyAnalysis ? 'accepted' : initialProjectEditState.analysisState
  );
  const [focusFrameId, setFocusFrameId] = useState<string | undefined>(
    initialFocusFrameId ?? initialProjectEditState.focusFrameId
  );
  const [commentDraft, setCommentDraft] = useState(initialProjectEditState.commentDraft);
  const [versionLabel, setVersionLabel] = useState(initialProjectEditState.versionLabel);
  const [audioConfig, setAudioConfig] = useState<AudioTrackConfig>(
    initialData?.audioConfig ?? initialProjectEditState.audioConfig
  );
  const [audioEditorKey, setAudioEditorKey] = useState(
    initialData?.audioConfig ? `audio-${Date.now()}` : 'audio-init'
  );
  const [audioGenerating, setAudioGenerating] = useState(initialProjectEditState.audioGenerating);
  const [characters, setCharacters] = useState<Character[]>(
    initialData?.characters ?? initialProjectEditState.characters
  );
  const [composition, setComposition] = useState<CompositionProject | null>(
    initialData?.composition ?? initialProjectEditState.composition
  );

  // 动态同步异步加载的项目数据与指定初始步骤 (Step 0 -> Step 3)
  useEffect(() => {
    if (initialData) {
      const dataKey = [
        effectiveProjectId ?? '',
        initialData.content ?? '',
        initialData.storyboardFrames?.length ?? 0,
        initialData.storyboardComments?.length ?? 0,
        initialData.storyboardVersions?.length ?? 0,
      ].join(':');
      if (hydratedDataKeyRef.current === dataKey) return;
      hydratedDataKeyRef.current = dataKey;
      if (initialData.content) {
        setContent(initialData.content);
      }
      if (initialData.storyAnalysis) {
        setStoryAnalysis(initialData.storyAnalysis);
      }
      if (initialData.characters && initialData.characters.length > 0) {
        setCharacters(initialData.characters);
      }
      const frames = asStoryboardFrames(initialData.storyboardFrames);
      const comments = asFrameComments(initialData.storyboardComments);
      const versions = asStoryboardVersions(initialData.storyboardVersions);
      setStoryboardFrames(frames);
      setStoryboardComments(comments);
      setStoryboardVersions(versions);
      if (effectiveProjectId) {
        collaborationService.hydrate(effectiveProjectId, comments, versions);
      }
      if (typeof initialData.initialStep === 'number') {
        setCurrentStep(initialData.initialStep);
      }
    }
  }, [
    effectiveProjectId,
    initialData,
    setCurrentStep,
    setStoryboardComments,
    setStoryboardFrames,
    setStoryboardVersions,
  ]);

  // ─── Actions (extracted) ─────────────────────────────────────────────────
  const actions = useProjectEditActions({
    content,
    setContent,
    setNovelMetadata,
    setLoading,
    setStoryAnalysis,
    setAnalysisDraft,
    setAnalysisState,
    setCommentDraft,
    setVersionLabel,
    setAudioConfig,
    setAudioEditorKey,
    setAudioGenerating,
    setCharacters,
    setComposition,
    setFocusFrameId,
    project: project as { id: string; name: string; createdAt: string } | null,
    setSaving,
    updateProject: updateProject as (updates: Record<string, unknown>) => void,
    setCurrentStep,
    storyboard,
    novelMetadata,
    storyAnalysis,
    analysisDraft,
    commentDraft,
    versionLabel,
    audioConfig,
    characters,
    composition,
    projectMetadata,
    startTransition,
  });

  const state = {
    projectId: effectiveProjectId,
    projectName: projectMetadata.name,
    projectDescription: projectMetadata.description,
    content,
    novelMetadata,
    loading,
    storyAnalysis,
    analysisDraft,
    analysisState,
    focusFrameId,
    commentDraft,
    versionLabel,
    audioConfig,
    audioEditorKey,
    audioGenerating,
    characters,
    composition,
  };

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <ProjectEditContext.Provider value={value}>{children}</ProjectEditContext.Provider>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asStoryboardFrames(value: unknown[] | undefined): StoryboardFrame[] {
  return (value ?? []).flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string') return [];
    return [
      {
        id: item.id,
        title: item.title,
        sceneDescription: typeof item.sceneDescription === 'string' ? item.sceneDescription : '',
        composition: typeof item.composition === 'string' ? item.composition : '',
        cameraType: typeof item.cameraType === 'string' ? item.cameraType : '',
        dialogue: typeof item.dialogue === 'string' ? item.dialogue : '',
        duration:
          typeof item.duration === 'number' && Number.isFinite(item.duration) ? item.duration : 5,
        imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
        videoUrl: typeof item.videoUrl === 'string' ? item.videoUrl : undefined,
      },
    ];
  });
}

function asFrameComments(value: unknown[] | undefined): FrameComment[] {
  return (value ?? []).filter(
    (item): item is FrameComment =>
      isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.projectId === 'string' &&
      typeof item.frameId === 'string' &&
      typeof item.content === 'string' &&
      typeof item.createdAt === 'string'
  );
}

function asStoryboardVersions(value: unknown[] | undefined): StoryboardVersion[] {
  return (value ?? []).filter(
    (item): item is StoryboardVersion =>
      isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.projectId === 'string' &&
      typeof item.label === 'string' &&
      typeof item.createdAt === 'string'
  );
}
