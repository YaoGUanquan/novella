import {
  Bot,
  Check,
  Film,
  FolderOpen,
  ImageIcon,
  Save,
  Settings as SettingsIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import {
  DEFAULT_REMOTE_VIDEO_GATEWAY,
  loadRemoteVideoGatewaySettings,
  loadServiceConnection,
  saveRemoteVideoGatewaySettings,
  saveServiceConnection,
  type ServiceConnectionKind,
  type ServiceConnectionSettings,
} from '@/core/config/ai-connection-settings';
import { tauriService } from '@/infrastructure/tauri-bridge/commands';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { toast } from '@/shared/components/ui/toast';

const isTauriRuntime = () =>
  typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const SERVICE_META: Record<
  ServiceConnectionKind,
  { title: string; description: string; icon: typeof Bot }
> = {
  dialogue: {
    title: '对话模型',
    description: '用于剧本、小说分析和对话生成。系统会根据模型自动选择请求策略。',
    icon: Bot,
  },
  image: {
    title: '图片生成模型',
    description:
      '用于角色立绘、分镜和场景图片生成。请填 OpenAI 兼容地址，例如 https://你的sub2api/v1，模型如 grok-imagine-image。桌面端走原生 HTTPS，不走浏览器跨域。',
    icon: ImageIcon,
  },
  video: {
    title: '视频生成模型',
    description: '用于远程视频生成，支持 /v1/video/generations 和 /v1/videos 模型。',
    icon: Film,
  },
};

const SettingsPage = () => {
  const [workingDir, setWorkingDir] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('novella_working_dir') || '' : ''
  );
  const [connections, setConnections] = useState<
    Record<ServiceConnectionKind, ServiceConnectionSettings>
  >({
    dialogue: {
      kind: 'dialogue',
      baseUrl: '',
      apiKey: '',
      model: '',
      protocol: 'openai',
      enabled: true,
    },
    image: { kind: 'image', baseUrl: '', apiKey: '', model: '', enabled: true },
    video: { kind: 'video', baseUrl: '', apiKey: '', model: '', enabled: false },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadServiceConnection('dialogue'),
      loadServiceConnection('image'),
      loadRemoteVideoGatewaySettings(),
    ])
      .then(([dialogue, image, video]) => {
        if (!active) return;
        setConnections({
          dialogue,
          image,
          video: {
            kind: 'video',
            baseUrl: video.baseUrl,
            apiKey: video.apiKey,
            model: video.model,
            enabled: video.enabled,
          },
        });
      })
      .catch(() => toast.error('读取服务配置失败'));
    return () => {
      active = false;
    };
  }, []);

  const updateConnection = (
    kind: ServiceConnectionKind,
    patch: Partial<ServiceConnectionSettings>
  ) => {
    setConnections((current) => ({ ...current, [kind]: { ...current[kind], ...patch } }));
  };

  const saveAll = async () => {
    const invalid = (Object.values(connections) as ServiceConnectionSettings[]).find(
      (connection) =>
        connection.enabled && connection.apiKey.trim() && !isHttpUrl(connection.baseUrl)
    );
    if (invalid) {
      toast.error(`${SERVICE_META[invalid.kind].title} 的请求地址必须是 http(s) 地址`);
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        saveServiceConnection(connections.dialogue),
        saveServiceConnection(connections.image),
        saveServiceConnection(connections.video),
        saveRemoteVideoGatewaySettings({
          ...DEFAULT_REMOTE_VIDEO_GATEWAY,
          enabled: connections.video.enabled,
          baseUrl: connections.video.baseUrl,
          apiKey: connections.video.apiKey,
          model: connections.video.model,
        }),
      ]);
      toast.success('三类服务配置已保存');
    } catch {
      toast.error('服务配置保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkingDir = (value: string) => {
    const trimmed = value.trim();
    setWorkingDir(trimmed);
    if (trimmed) {
      localStorage.setItem('novella_working_dir', trimmed);
    } else {
      localStorage.removeItem('novella_working_dir');
    }
  };

  const handleSelectWorkingDir = async () => {
    if (!isTauriRuntime()) {
      toast.info('浏览器模式无法读取本地绝对路径，请在桌面版 Novella 中选择目录，或直接输入路径');
      return;
    }
    try {
      const selected = await tauriService.selectDirectory({ defaultPath: workingDir || undefined });
      if (selected) {
        handleSaveWorkingDir(selected);
        toast.success('工作目录已更新');
      }
    } catch {
      toast.error('打开目录选择器失败');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      <div className="studio-card p-6 space-y-1">
        <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-indigo-400" /> 系统偏好设置
        </h2>
        <p className="text-xs text-[var(--muted-foreground)]">
          配置对话、图片生成、视频生成服务和本地工程工作目录
        </p>
      </div>

      <div className="studio-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 gap-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" /> AI 服务连接
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
              每类服务只需要请求地址、API Key 和模型 ID
            </p>
          </div>
          <Button
            size="sm"
            onClick={saveAll}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg border-0 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? '保存中...' : '保存全部'}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(SERVICE_META) as ServiceConnectionKind[]).map((kind) => {
            const connection = connections[kind];
            const meta = SERVICE_META[kind];
            const Icon = meta.icon;
            return (
              <section
                key={kind}
                className="p-4 border border-[var(--border)] rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-[var(--foreground)]">{meta.title}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border ${connection.apiKey ? 'text-emerald-400 border-emerald-500/20' : 'text-amber-400 border-amber-500/20'}`}
                  >
                    {connection.apiKey ? '已配置' : '未配置'}
                  </span>
                </div>
                <p className="min-h-8 text-[11px] leading-4 text-[var(--muted-foreground)]">
                  {meta.description}
                </p>
                <Input
                  type="password"
                  value={connection.apiKey}
                  onChange={(event) => updateConnection(kind, { apiKey: event.target.value })}
                  placeholder="API Key"
                  className="bg-transparent text-xs"
                />
                <Input
                  value={connection.baseUrl}
                  onChange={(event) => updateConnection(kind, { baseUrl: event.target.value })}
                  placeholder="请求地址，例如 https://api.example.com/v1"
                  className="bg-transparent text-xs font-mono"
                />
                <Input
                  value={connection.model}
                  onChange={(event) => updateConnection(kind, { model: event.target.value })}
                  placeholder="模型 ID，例如 gpt-5.6-sol"
                  className="bg-transparent text-xs"
                />
                {kind === 'video' && (
                  <label className="flex items-center gap-2 text-xs text-[var(--foreground)]">
                    <input
                      type="checkbox"
                      checked={connection.enabled}
                      onChange={(event) =>
                        updateConnection(kind, { enabled: event.target.checked })
                      }
                    />{' '}
                    启用远程视频生成
                  </label>
                )}
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                  保存后会参与对应生成流程
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="studio-card p-6 space-y-4">
        <div className="border-b border-[var(--border)] pb-3">
          <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-400" /> 本地工程工作目录
          </h3>
          <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
            漫剧工程文件、视频压制缓存与 TTS 音轨数据的本地绝对存储路径
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={workingDir}
            onChange={(event) => handleSaveWorkingDir(event.target.value)}
            placeholder="例如 D:\\NovellaWorkspace"
            className="bg-transparent text-xs font-mono flex-1"
          />
          <Button
            onClick={handleSelectWorkingDir}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2.5 rounded-lg border-0 font-bold flex items-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5" /> 选择目录
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
