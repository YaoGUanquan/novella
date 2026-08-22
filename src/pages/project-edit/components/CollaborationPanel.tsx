import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { collaborationService } from '@/core/services';
import type { FrameComment } from '@/core/services';

import { useCollaborationContext } from '../context/selectors';
import styles from '../ProjectEdit.module.less';

function VersionSelect({
  value,
  onValueChange,
  placeholder,
  versions,
}: {
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder: string;
  versions: ReadonlyArray<{ id: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {versions.map((version) => (
          <SelectItem key={version.id} value={version.id}>
            {version.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CollaborationPanel() {
  const {
    projectId,
    commentDraft,
    versionLabel,
    selectedFrame,
    compareLeftVersionId,
    compareRightVersionId,
    versionDiff,
    storyboardVersions,
    onCommentDraftChange,
    onAddComment,
    onSaveVersion,
    onCompareVersions,
    onRollback,
    onLeftVersionChange,
    onRightVersionChange,
    onVersionLabelChange,
  } = useCollaborationContext();
  const comments = projectId ? collaborationService.listComments(projectId, selectedFrame?.id) : [];

  return (
    <div className={styles.collaborationPanel}>
      <section className={styles.collabSection}>
        <h5 className="mb-3 font-semibold">镜头评论</h5>
        <div className="mb-3 flex gap-2">
          <Input
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(event.target.value)}
            placeholder={
              selectedFrame ? `为「${selectedFrame.title}」添加评论` : '请先选择一个分镜'
            }
            disabled={!selectedFrame}
          />
          <Button
            variant="default"
            onClick={onAddComment}
            disabled={!selectedFrame || !commentDraft.trim()}
          >
            添加
          </Button>
        </div>
        <div className="space-y-2">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">当前镜头暂无评论</p>
          ) : (
            comments.map((item: FrameComment) => (
              <div key={item.id} className="rounded-md border p-2">
                <div className="text-sm">{item.content}</div>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.collabSection}>
        <h5 className="mb-3 font-semibold">版本管理</h5>
        <div className="mb-3 flex flex-wrap gap-2">
          <Input
            value={versionLabel}
            onChange={(event) => onVersionLabelChange(event.target.value)}
            placeholder="版本标签（可选）"
            className="w-[220px]"
            onKeyDown={(event) => event.key === 'Enter' && onSaveVersion()}
          />
          <Button variant="outline" onClick={onSaveVersion}>
            保存快照
          </Button>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <VersionSelect
            value={compareLeftVersionId}
            onValueChange={onLeftVersionChange}
            placeholder="选择版本 A"
            versions={storyboardVersions}
          />
          <VersionSelect
            value={compareRightVersionId}
            onValueChange={onRightVersionChange}
            placeholder="选择版本 B"
            versions={storyboardVersions}
          />
          <Button variant="outline" onClick={onCompareVersions}>
            比较版本
          </Button>
          <Button variant="destructive" onClick={onRollback}>
            回滚到版本 A
          </Button>
        </div>
        {versionDiff && (
          <Alert
            variant="default"
            className={
              versionDiff.changeCount > 0
                ? 'border-blue-200 bg-blue-50'
                : 'border-green-200 bg-green-50'
            }
          >
            <p className="font-medium">差异字段数：{versionDiff.changeCount}</p>
            <p className="text-sm">{versionDiff.changedKeys.slice(0, 6).join(', ') || '无差异'}</p>
          </Alert>
        )}
      </section>
    </div>
  );
}

export default CollaborationPanel;
