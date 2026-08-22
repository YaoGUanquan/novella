import { Film, Image as ImageIcon, Loader2, Save, Sparkles, Video, Wand2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { generateImage } from '@/core/services/ai/image/image-generation-service';
import type { StoryboardFrame } from '@/core/storyboard/types/storyboard';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';

export type { StoryboardFrame } from '@/core/storyboard/types/storyboard';

interface StoryboardEditorProps {
  initialFrames?: StoryboardFrame[];
  focusFrameId?: string;
  onChange?: (frames: StoryboardFrame[]) => void;
  onFrameSelect?: (frame: StoryboardFrame | null) => void;
}

export const StoryboardEditor: React.FC<StoryboardEditorProps> = ({
  initialFrames = [],
  focusFrameId,
  onChange,
  onFrameSelect,
}) => {
  const [frames, setFrames] = useState<StoryboardFrame[]>(initialFrames);
  const [selectedFrameId, setSelectedFrameId] = useState<string | undefined>(
    focusFrameId ?? initialFrames[0]?.id
  );
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setFrames(initialFrames);
    setSelectedFrameId((current) => {
      if (focusFrameId && initialFrames.some((frame) => frame.id === focusFrameId)) {
        return focusFrameId;
      }
      return initialFrames.some((frame) => frame.id === current) ? current : initialFrames[0]?.id;
    });
  }, [focusFrameId, initialFrames]);

  const selectedFrame = frames.find((frame) => frame.id === selectedFrameId);

  const selectFrame = (frame: StoryboardFrame) => {
    setSelectedFrameId(frame.id);
    onFrameSelect?.(frame);
  };

  const updateFrame = (frameId: string, updates: Partial<StoryboardFrame>) => {
    const updatedFrames = frames.map((frame) =>
      frame.id === frameId ? { ...frame, ...updates } : frame
    );
    setFrames(updatedFrames);
    onChange?.(updatedFrames);
  };

  const handleGenerateFrameImage = async () => {
    if (!selectedFrame) {
      toast.warning('请先选择一个分镜后再生成画面');
      return;
    }

    const prompt = selectedFrame.sceneDescription.trim() || selectedFrame.title.trim();
    if (!prompt) {
      toast.warning('请先填写画面描述或分镜标题');
      return;
    }

    const frameId = selectedFrame.id;
    setIsGenerating(true);
    try {
      const result = await generateImage(prompt, { size: '2K' });
      updateFrame(frameId, { imageUrl: result.url });
      toast.success(`已生成「${selectedFrame.title}」的画面参考图`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '图片生成失败，请检查图片服务配置后重试'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (frames.length === 0) {
    return (
      <section className="rounded-lg border border-slate-700 bg-slate-950 p-8 text-center">
        <Film className="mx-auto mb-3 h-8 w-8 text-cyan-300" aria-hidden="true" />
        <h3 className="text-base font-semibold text-slate-100">暂无分镜</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
          请先根据已确认的内容分析生成分镜草案，或使用分镜 AI
          助手生成并确认回填。这里不会显示演示场景。
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-100">分镜画面工作台</h2>
            <p className="mt-0.5 text-xs text-slate-300">
              {selectedFrame ? `当前编辑：${selectedFrame.title}` : '请选择一个分镜'}，共{' '}
              {frames.length} 个分镜
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!selectedFrame || isGenerating}
            onClick={() => void handleGenerateFrameImage()}
          >
            {isGenerating ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-1.5 h-4 w-4" />
            )}
            {isGenerating ? '正在生成画面' : '生成当前画面'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange?.(frames);
              toast.info('分镜修改已同步到当前编辑状态，请使用页面顶部“保存修改”写入工程。');
            }}
          >
            <Save className="mr-1.5 h-4 w-4" />
            保存当前修改
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <section className="h-full rounded-lg border border-slate-700 bg-slate-950 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Film className="h-4 w-4 text-cyan-300" />
              分镜时间线（{frames.length}）
            </h3>
            <div className="space-y-2">
              {frames.map((frame, index) => {
                const isSelected = frame.id === selectedFrameId;
                return (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={() => selectFrame(frame)}
                    className={`w-full rounded-md border p-2 text-left transition-colors ${
                      isSelected
                        ? 'border-cyan-300 bg-cyan-300/10'
                        : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                    }`}
                  >
                    <div className="mb-2 flex aspect-video items-center justify-center overflow-hidden rounded border border-slate-700 bg-slate-900">
                      {frame.imageUrl ? (
                        <img
                          src={frame.imageUrl}
                          alt={`${frame.title} 画面参考`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex flex-col items-center gap-1 text-xs text-slate-400">
                          <ImageIcon className="h-5 w-5" />
                          暂无画面
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs font-semibold text-slate-100">
                      镜头 {index + 1}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-300">{frame.title}</p>
                    <p className="mt-1 text-xs text-slate-400">时长 {frame.duration || 0} 秒</p>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <main className="lg:col-span-5">
          <section className="h-full rounded-lg border border-slate-700 bg-slate-950 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Video className="h-4 w-4 text-cyan-300" />
              画面与视频预览
            </h3>
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border border-slate-700 bg-slate-900">
              {selectedFrame?.videoUrl ? (
                <video
                  className="h-full w-full"
                  controls
                  preload="metadata"
                  src={selectedFrame.videoUrl}
                >
                  当前浏览器不支持视频播放。
                </video>
              ) : selectedFrame?.imageUrl ? (
                <figure className="relative h-full w-full">
                  <img
                    src={selectedFrame.imageUrl}
                    alt={`${selectedFrame.title} 画面参考`}
                    className="h-full w-full object-cover"
                  />
                  <figcaption className="absolute bottom-0 w-full bg-slate-950/85 px-3 py-2 text-xs text-slate-200">
                    当前为画面参考图，尚未生成视频。
                  </figcaption>
                </figure>
              ) : (
                <div className="text-center text-sm text-slate-300">
                  <Video className="mx-auto mb-2 h-8 w-8 text-slate-500" />
                  暂无画面或视频素材
                </div>
              )}
            </div>
            {!selectedFrame?.videoUrl && (
              <p className="mt-3 text-xs text-slate-400">
                视频生成完成并写入视频地址后，才会在这里显示可播放的视频。
              </p>
            )}
          </section>
        </main>

        <aside className="lg:col-span-4">
          <section className="rounded-lg border border-slate-700 bg-slate-950 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Wand2 className="h-4 w-4 text-cyan-300" />
              画面提示词与镜头信息
            </h3>
            {selectedFrame && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-200">
                  分镜标题
                  <input
                    value={selectedFrame.title}
                    onChange={(event) =>
                      updateFrame(selectedFrame.id, { title: event.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-200">
                  画面描述
                  <textarea
                    value={selectedFrame.sceneDescription}
                    onChange={(event) =>
                      updateFrame(selectedFrame.id, { sceneDescription: event.target.value })
                    }
                    className="mt-1 min-h-28 w-full resize-y rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none"
                    placeholder="描述场景、人物、动作和画面风格"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-medium text-slate-200">
                    构图
                    <input
                      value={selectedFrame.composition}
                      onChange={(event) =>
                        updateFrame(selectedFrame.id, { composition: event.target.value })
                      }
                      className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-200">
                    镜头类型
                    <input
                      value={selectedFrame.cameraType}
                      onChange={(event) =>
                        updateFrame(selectedFrame.id, { cameraType: event.target.value })
                      }
                      className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none"
                    />
                  </label>
                </div>
                <label className="block text-xs font-medium text-slate-200">
                  对白
                  <textarea
                    value={selectedFrame.dialogue}
                    onChange={(event) =>
                      updateFrame(selectedFrame.id, { dialogue: event.target.value })
                    }
                    className="mt-1 min-h-20 w-full resize-y rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none"
                    placeholder="当前镜头中的对白或旁白"
                  />
                </label>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default StoryboardEditor;
