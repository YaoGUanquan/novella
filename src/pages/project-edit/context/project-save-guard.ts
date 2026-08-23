export interface ProjectPersistInput {
  name: string;
  content?: string;
  description?: string;
  script?: string;
  characterCount: number;
}

export function resolveProjectPersistId(
  loadedProjectId: string | undefined,
  routeProjectId: string | undefined,
  createId: () => string
): string {
  return loadedProjectId || routeProjectId || createId();
}

export function resolveProjectPersistContent(input: ProjectPersistInput): string {
  return (
    [input.content, input.script, input.description]
      .map((value) => value?.trim() ?? '')
      .find(Boolean) ?? ''
  );
}

export function getProjectPersistBlocker(input: ProjectPersistInput): string | null {
  if (!input.name.trim()) return '请填写项目名称';
  if (!resolveProjectPersistContent(input) && input.characterCount === 0) {
    return '请先填写剧情概要或导入小说/剧本内容';
  }
  return null;
}
