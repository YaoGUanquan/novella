/**
 * 工程加载合并：Zustand 列表只作首屏，已写入文件的确认数据优先。
 */

export function buildProjectHydrationKey(input: {
  projectId?: string;
  content?: string;
  storyboardFramesLength?: number;
  storyboardCommentsLength?: number;
  storyboardVersionsLength?: number;
  charactersLength?: number;
  characters?: unknown[];
}): string {
  return [
    input.projectId ?? '',
    input.content ?? '',
    input.storyboardFramesLength ?? 0,
    input.storyboardCommentsLength ?? 0,
    input.storyboardVersionsLength ?? 0,
    input.charactersLength ?? 0,
    JSON.stringify(input.characters ?? []),
  ].join(':');
}

export function selectProjectLoadFallback<T extends { id?: unknown }>(
  projects: T[],
  currentProject: T | null | undefined,
  projectId: string
): T | null {
  return (
    projects.find((project) => String(project.id) === String(projectId)) ??
    (currentProject && String(currentProject.id) === String(projectId) ? currentProject : null)
  );
}

export function shouldHydrateProjectCharacters(input: {
  hasLocalCharacterEdits: boolean;
  incomingCharacters?: unknown[];
}): boolean {
  return !input.hasLocalCharacterEdits && Boolean(input.incomingCharacters?.length);
}

export function mergeProjectLoadSources<T extends { characters?: unknown[]; content?: string }>(
  storeProject: T | null,
  fileProject: T | null
): T | null {
  if (!fileProject) return storeProject;
  if (!storeProject) return fileProject;
  return {
    ...storeProject,
    ...fileProject,
    characters:
      fileProject.characters && fileProject.characters.length > 0
        ? fileProject.characters
        : storeProject.characters,
    content: fileProject.content || storeProject.content,
  };
}
