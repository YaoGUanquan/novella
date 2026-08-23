import type { ProjectData } from '@/core/project/types/project';
import { useProjectStore } from '@/shared/stores/project-store';

/** 把刚写入工程文件的确认数据同步进 Zustand 列表，避免重启后被无角色的旧列表挡住。 */
export function syncPersistedProjectToStore(projectData: ProjectData): void {
  const store = useProjectStore.getState();
  const exists = store.projects.some((project) => String(project.id) === String(projectData.id));
  if (!exists) {
    store.createProject(projectData);
  }
  store.updateProject(projectData.id, projectData);
  store.setCurrentProject({
    ...(store.currentProject ?? projectData),
    ...projectData,
  });
}
