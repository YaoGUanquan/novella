import type { ProjectData } from '@/shared/types/project';

/**
 * Merge generated workflow data into an existing project while preserving its
 * identity and creation timestamp.
 */
export function mergeWorkflowResultIntoProject(
  existingProject: ProjectData | undefined | null,
  workflowResult: Partial<ProjectData>
): ProjectData | null {
  if (!existingProject) return null;

  return {
    ...existingProject,
    ...workflowResult,
    id: existingProject.id,
    createdAt: existingProject.createdAt,
    updatedAt: workflowResult.updatedAt || new Date().toISOString(),
  };
}
