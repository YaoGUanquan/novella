import { Plus, Edit3, Trash2, Play, ImageIcon, FolderOpen, Search } from 'lucide-react';
import React, { useCallback, memo, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import CreateProjectModal from '@/features/project/components/AICreateProjectModal';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { toast } from '@/shared/components/ui/toast';
import { useProjectStore } from '@/shared/stores/project-store';
import type { ProjectData } from '@/shared/types';

const PROJECT_STATUS_LABELS: Record<NonNullable<ProjectData['status']>, string> = {
  draft: '草稿',
  processing: '处理中',
  completed: '已完成',
  failed: '处理失败',
};

interface ProjectGridProps {
  projects: ProjectData[];
  loading: boolean;
}

interface ProjectCardProps {
  project: ProjectData;
  onView: (id: string) => void;
  onEdit: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const ProjectCard = memo(function ProjectCard({
  project,
  onView,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  return (
    <article
      key={project.id}
      aria-label={project.name}
      className="studio-card group relative min-w-0 overflow-hidden p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-indigo-500/50 transition-[border-color,box-shadow,transform] duration-300 flex flex-col justify-between space-y-3 shadow-lg hover:shadow-2xl motion-safe:hover:-translate-y-1"
    >
      {/* 16:9 视听缩略图预览 */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[var(--accent)] border border-[var(--border)] flex items-center justify-center shadow-inner">
        <button
          type="button"
          onClick={() => onView(project.id)}
          aria-label={`打开工程 ${project.name}`}
          className="absolute inset-1 z-10 rounded-lg cursor-pointer"
        />
        {project.thumbnail ? (
          <img
            alt={project.name}
            src={project.thumbnail}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-[var(--muted-foreground)]">
            <ImageIcon className="w-8 h-8 opacity-40 stroke-1 text-indigo-400" />
            <span className="text-[10px] font-mono">暂无工程封面</span>
          </div>
        )}

        {/* 悬浮中央发光 Play 按钮 */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] shadow-lg shadow-indigo-500/40 group-hover:scale-110 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
              <Play className="w-5 h-5 text-indigo-400 fill-current ml-0.5" />
            </div>
          </div>
        </div>

        {/* 快捷悬浮栏 */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => onEdit(project.id, e)}
            className="p-1.5 rounded-lg bg-black/70 backdrop-blur-md text-white hover:bg-indigo-600 transition-colors cursor-pointer"
            title="编辑工程"
            aria-label={`编辑工程 ${project.name}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => onDelete(project.id, e)}
            className="p-1.5 rounded-lg bg-black/70 backdrop-blur-md text-rose-400 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
            title="删除工程"
            aria-label={`删除工程 ${project.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 标题、元数据与快捷按钮 */}
      <div className="space-y-2.5">
        <div className="min-w-0">
          <h4 className="font-bold text-sm text-[var(--foreground)] group-hover:text-indigo-400 transition-colors">
            <button
              type="button"
              onClick={() => onView(project.id)}
              className="block w-full truncate text-left cursor-pointer"
              title={project.name}
            >
              {project.name}
            </button>
          </h4>
        </div>

        <p className="text-xs text-[var(--muted-foreground)] line-clamp-1">
          {project.description || '暂无工程描述'}
        </p>

        {/* 纯中文元数据标签组 */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {project.aspectRatio && (
            <span className="px-2 py-0.5 rounded-md bg-[var(--accent)] border border-[var(--border)] text-[10px] font-mono font-semibold text-[var(--muted-foreground)]">
              {project.aspectRatio}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-mono font-bold text-indigo-400">
            {PROJECT_STATUS_LABELS[project.status] || '未标注状态'}
          </span>
        </div>

        {/* 快捷操作按钮组 */}
        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[var(--border)] text-center">
          <button
            onClick={(e) => onEdit(project.id, e)}
            className="px-2 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 text-[11px] font-bold transition-all cursor-pointer"
          >
            继续创作
          </button>
          <button
            onClick={(e) => onEdit(project.id, e)}
            className="px-2 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] text-[11px] font-medium transition-all cursor-pointer"
          >
            工程编辑
          </button>
          <button
            onClick={() => onView(project.id)}
            className="px-2 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] text-[11px] font-medium transition-all cursor-pointer"
          >
            预览画幅
          </button>
        </div>
      </div>
    </article>
  );
});

function ProjectGrid({ projects, loading }: ProjectGridProps) {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ProjectData | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const deleteTrigger = useRef<HTMLButtonElement | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const cancelButton = useRef<HTMLButtonElement | null>(null);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query));
      return matchesSearch;
    });
  }, [projects, searchQuery]);

  const handleCreateProject = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleViewProject = useCallback(
    (id: string) => {
      const store = useProjectStore.getState();
      const targetProj = store.projects.find((p) => p.id === id);
      if (targetProj && typeof store.setCurrentProject === 'function') {
        store.setCurrentProject(targetProj);
      }
      navigate(`/project/${id}`);
    },
    [navigate]
  );

  const handleEditProject = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const store = useProjectStore.getState();
      const targetProj = store.projects.find((p) => p.id === id);
      if (targetProj && typeof store.setCurrentProject === 'function') {
        store.setCurrentProject(targetProj);
      }
      navigate(`/project/edit/${id}`);
    },
    [navigate]
  );

  const handleDeleteProject = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const project = projects.find((item) => item.id === id);
      if (!project) return;
      deleteTrigger.current = e.currentTarget as HTMLButtonElement;
      setDeleteError('');
      setPendingDelete(project);
    },
    [projects]
  );

  const confirmDelete = () => {
    if (!pendingDelete) return;
    try {
      useProjectStore.getState().deleteProject(pendingDelete.id);
      if (useProjectStore.getState().projects.some((p) => p.id === pendingDelete.id)) {
        setDeleteError('工程仍在列表中，请重试。');
        return;
      }
      setPendingDelete(null);
      toast.success('工程已从当前列表移除');
    } catch {
      setDeleteError('无法移除工程，请重试。');
    }
  };

  return (
    <div className="space-y-6">
      {/* 网格 Header 与 搜索过滤栏 */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-[var(--border)]">
        <div>
          <h3 className="text-base font-extrabold text-[var(--foreground)] flex items-center gap-2">
            我的漫剧工程大厅
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-mono font-bold">
              {projects.length} 部工程
            </span>
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            实时管理所有漫剧视听工程，快速进入 6 步 SOP 车间
          </p>
        </div>

        <div className="flex w-full sm:w-auto min-w-0 flex-wrap items-center gap-3">
          {/* 搜索框 */}
          <div className="relative min-w-0 w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              ref={searchInput}
              aria-label="搜索漫剧工程"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索漫剧工程名称..."
              className="pl-8 text-xs bg-[var(--accent)] border-[var(--border)] text-[var(--foreground)] rounded-xl py-1.5 h-8"
            />
          </div>

          <Button
            size="sm"
            onClick={handleCreateProject}
            className="studio-btn-primary flex-none px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer rounded-xl border-0 shadow-md shadow-indigo-500/20"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            新建漫剧工程
          </Button>
        </div>
      </div>

      {/* 漫剧工程网格区 */}
      {loading ? (
        <div
          role="status"
          className="flex items-center justify-center py-16 text-[var(--muted-foreground)]"
        >
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
          正在加载工程列表中...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="studio-card border border-[var(--border)] bg-[var(--card)] flex flex-col items-center justify-center py-16 text-center p-8 rounded-3xl space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/20">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-[var(--foreground)]">
              {searchQuery.trim() ? '未找到匹配的漫剧工程' : '暂无漫剧创作工程'}
            </h4>
            <p className="text-xs text-[var(--muted-foreground)] max-w-md leading-relaxed">
              {searchQuery.trim()
                ? '尝试更换搜索关键词，或新建一个漫剧工程。'
                : '点击下方按钮开启全新的 AI 漫剧工程，导入小说剧本文本即可开始自动化生成。'}
            </p>
          </div>
          {searchQuery.trim() && (
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              清除搜索
            </Button>
          )}
          <Button
            size="lg"
            onClick={handleCreateProject}
            className="studio-btn-primary px-6 py-2.5 text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            创建漫剧工程
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onView={handleViewProject}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
            />
          ))}

          {/* 新建工程 Card */}
          <button
            type="button"
            onClick={handleCreateProject}
            aria-label="新建漫剧工程"
            className="studio-card group cursor-pointer p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[240px] border border-dashed border-indigo-500/30 hover:border-indigo-500 bg-[var(--card)] hover:bg-[var(--accent)] transition-[border-color,background-color,transform] rounded-2xl motion-safe:hover:scale-105"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-xs font-bold text-[var(--foreground)] group-hover:text-indigo-400 transition-colors">
              新建漫剧工程
            </span>
          </button>
        </div>
      )}

      {/* 新建工程 Modal */}
      <CreateProjectModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent
          className="max-w-[calc(100%-2rem)] sm:max-w-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancelButton.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (deleteTrigger.current?.isConnected
              ? deleteTrigger.current
              : searchInput.current
            )?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>移除工程</DialogTitle>
            <DialogDescription className="break-words">
              确认将“{pendingDelete?.name}”从工程列表移除？此操作不会删除磁盘中的工程文件。
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-rose-400">
              {deleteError}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button ref={cancelButton} variant="outline" onClick={() => setPendingDelete(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              确认移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProjectGrid;
