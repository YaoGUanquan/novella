/**
 * Tauri 桥接层 - 命令服务
 * 类型安全的 Tauri invoke 封装
 *
 * 类型定义在 commands-types.ts
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { appConfigDir, appDataDir, documentDir, videoDir, downloadDir } from '@tauri-apps/api/path';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open, save, message, ask, confirm } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, exists, mkdir, remove, readDir } from '@tauri-apps/plugin-fs';
import {
  sendNotification,
  isPermissionGranted,
  requestPermission,
} from '@tauri-apps/plugin-notification';

import type { DialogueStreamEvent } from '@/core/ai/dialogue-stream-events';
import { textChunksFromEvents } from '@/core/ai/dialogue-stream-events';
import { logger } from '@/core/utils/logger';
import type { AIMessage } from '@/shared/types/ai-core';

import type {
  OpenFileOptions,
  SaveFileOptions,
  VideoClipOptions,
  PreviewOptions,
  ExportOptions,
  ExportProgress,
  ExportProgressCallback,
  DirInfo,
} from './commands-types';

// Re-export types 保持向后兼容
export type {
  OpenFileOptions,
  SaveFileOptions,
  VideoClipOptions,
  PreviewOptions,
  ExportOptions,
  ExportProgress,
  ExportProgressCallback,
  DirInfo,
} from './commands-types';

export interface NativeConfiguredDialogueRequest {
  streamId: string;
  protocol: 'openai' | 'anthropic';
  endpoint: string;
  apiKey: string;
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

interface NativeDialogueChunkEvent {
  stream_id: string;
  content: string;
  kind?: 'text' | 'thinking';
}
interface NativeDialogueCompleteEvent {
  stream_id: string;
  cancelled: boolean;
}
interface NativeDialogueErrorEvent {
  stream_id: string;
  kind: string;
  status?: number;
  message: string;
}

function isTauriRuntime(): boolean {
  return (
    typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
}

// ========== 服务类 ==========

class TauriService {
  // ========== 窗口操作 ==========

  /**
   * 获取当前窗口
   */
  async getCurrentWindowApi() {
    return getCurrentWindow();
  }

  /**
   * 最小化窗口
   */
  async minimize() {
    const win = getCurrentWindow();
    await win.minimize();
  }

  /**
   * 最大化/还原窗口
   */
  async toggleMaximize() {
    const win = getCurrentWindow();
    const isMaximized = await win.isMaximized();
    if (isMaximized) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
  }

  /**
   * 关闭窗口
   */
  async close() {
    const win = getCurrentWindow();
    await win.close();
  }

  /**
   * 设置窗口标题
   */
  async setTitle(title: string) {
    const win = getCurrentWindow();
    await win.setTitle(title);
  }

  /**
   * 设置全屏
   */
  async setFullscreen(fullscreen: boolean) {
    const win = getCurrentWindow();
    await win.setFullscreen(fullscreen);
  }

  /**
   * 设置置顶
   */
  async setAlwaysOnTop(alwaysOnTop: boolean) {
    const win = getCurrentWindow();
    await win.setAlwaysOnTop(alwaysOnTop);
  }

  // ========== 文件操作 ==========

  /**
   * 打开文件选择对话框
   */
  async openFile(options?: OpenFileOptions): Promise<string | string[] | null> {
    const result = await open({
      title: options?.title ?? '选择文件',
      defaultPath: options?.defaultPath,
      filters: options?.filters,
      multiple: options?.multiple ?? false,
      directory: options?.directory ?? false,
    });
    return result;
  }

  async selectDirectory(options?: {
    title?: string;
    defaultPath?: string;
  }): Promise<string | null> {
    const result = await open({
      title: options?.title ?? '选择工作目录',
      defaultPath: options?.defaultPath,
      directory: true,
      multiple: false,
    });
    return typeof result === 'string' ? result : null;
  }

  /**
   * 打开保存文件对话框
   */
  async saveFile(options?: SaveFileOptions): Promise<string | null> {
    const result = await save({
      title: options?.title ?? '保存文件',
      defaultPath: options?.defaultPath,
      filters: options?.filters,
    });
    return result;
  }

  /**
   * 读取项目文件（通过 Rust 命令，安全解析到 $APPDATA/{id}.json）
   */
  async readProjectFile(projectId: string): Promise<string> {
    return invoke<string>('read_project_file', { projectId });
  }

  /**
   * 保存项目文件（通过 Rust 命令，安全解析到 $APPDATA/{id}.json）
   */
  async saveProjectFile(projectId: string, contents: string): Promise<void> {
    return invoke<void>('save_project_file', { projectId, content: contents });
  }

  /**
   * 读取文本文件（原始路径，仅用于非项目文件的场景）
   * @deprecated 项目文件请用 readProjectFile
   */
  async readText(filePath: string): Promise<string> {
    return readTextFile(filePath);
  }

  /**
   * 写入文本文件（原始路径，仅用于非项目文件的场景）
   * @deprecated 项目文件请用 saveProjectFile
   */
  async writeText(filePath: string, contents: string): Promise<void> {
    return writeTextFile(filePath, contents);
  }

  /**
   * 检查文件/目录是否存在
   */
  async fileExists(path: string): Promise<boolean> {
    return exists(path);
  }

  /**
   * 创建目录
   */
  async createDir(path: string): Promise<void> {
    return mkdir(path, { recursive: true });
  }

  /**
   * 删除文件/目录
   */
  async removePath(path: string): Promise<void> {
    return remove(path, { recursive: true });
  }

  /**
   * 读取目录内容
   */
  async listDir(path: string): Promise<DirInfo[]> {
    const entries = await readDir(path);
    return entries.map((entry) => ({
      name: entry.name,
      path: `${path}/${entry.name}`,
      isDirectory:
        'isDirectory' in entry
          ? (entry as { isDirectory: boolean }).isDirectory
          : ((entry as { is_directory: boolean }).is_directory ?? false),
    }));
  }

  /**
   * Stream a configured dialogue through the Rust transport. The API key is
   * passed only to the native command and is never included in emitted events.
   */
  async *streamConfiguredDialogue(
    request: NativeConfiguredDialogueRequest,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    yield* textChunksFromEvents(this.streamConfiguredDialogueEvents(request, signal));
  }

  /**
   * Stream typed native dialogue events. Thinking chunks are omitted from
   * `streamConfiguredDialogue()` so JSON callers are not polluted.
   */
  async *streamConfiguredDialogueEvents(
    request: NativeConfiguredDialogueRequest,
    signal?: AbortSignal
  ): AsyncGenerator<DialogueStreamEvent> {
    if (!isTauriRuntime()) {
      throw new Error('原生对话传输仅在桌面端可用');
    }

    const queue: Array<
      NativeDialogueChunkEvent | NativeDialogueCompleteEvent | NativeDialogueErrorEvent
    > = [];
    let wake: (() => void) | null = null;
    let complete = false;
    let cancelled = false;
    let terminalError: NativeDialogueErrorEvent | null = null;

    const push = (
      event: NativeDialogueChunkEvent | NativeDialogueCompleteEvent | NativeDialogueErrorEvent
    ) => {
      queue.push(event);
      wake?.();
      wake = null;
    };
    const waitForEvent = () =>
      new Promise<void>((resolve) => {
        wake = resolve;
      });
    const unlisten = await Promise.all([
      listen<NativeDialogueChunkEvent>('novella://dialogue/chunk', (event) => {
        if (event.payload.stream_id === request.streamId) push(event.payload);
      }),
      listen<NativeDialogueCompleteEvent>('novella://dialogue/complete', (event) => {
        if (event.payload.stream_id === request.streamId) push(event.payload);
      }),
      listen<NativeDialogueErrorEvent>('novella://dialogue/error', (event) => {
        if (event.payload.stream_id === request.streamId) push(event.payload);
      }),
    ]);
    const abort = () => {
      cancelled = true;
      void invoke('cancel_configured_dialogue', { streamId: request.streamId });
      push({ stream_id: request.streamId, cancelled: true });
    };
    signal?.addEventListener('abort', abort, { once: true });

    try {
      await invoke('start_configured_dialogue', {
        request: {
          stream_id: request.streamId,
          protocol: request.protocol,
          endpoint: request.endpoint,
          api_key: request.apiKey,
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        },
      });
      while (!complete || queue.length > 0) {
        if (queue.length === 0) {
          await waitForEvent();
          continue;
        }
        const event = queue.shift()!;
        if ('content' in event) {
          yield {
            kind: event.kind === 'thinking' ? 'thinking' : 'text',
            text: event.content,
          };
        } else if ('message' in event) {
          terminalError = event;
          complete = true;
        } else {
          complete = true;
          cancelled = cancelled || event.cancelled;
        }
      }
      if (terminalError && !cancelled) {
        const error = new Error(terminalError.message) as Error & {
          status?: number;
          kind?: string;
        };
        error.name = 'NativeConfiguredDialogueError';
        error.status = terminalError.status;
        error.kind = terminalError.kind;
        throw error;
      }
    } finally {
      signal?.removeEventListener('abort', abort);
      unlisten.forEach((remove) => remove());
      if (!complete && !cancelled) {
        void invoke('cancel_configured_dialogue', { streamId: request.streamId });
      }
    }
  }

  // ========== 路径操作 ==========

  /**
   * 获取应用目录
   */
  async getAppDir(): Promise<string> {
    return appConfigDir();
  }

  /**
   * 获取应用配置目录
   */
  async getAppConfigDir(): Promise<string> {
    return appConfigDir();
  }

  /**
   * 获取应用数据目录
   */
  async getAppDataDir(): Promise<string> {
    return appDataDir();
  }

  /**
   * 获取文档目录
   */
  async getDocumentDir(): Promise<string | null> {
    return documentDir();
  }

  /**
   * 获取视频目录
   */
  async getVideoDir(): Promise<string | null> {
    return videoDir();
  }

  /**
   * 获取下载目录
   */
  async getDownloadDir(): Promise<string | null> {
    return downloadDir();
  }

  // ========== 对话框 ==========

  /**
   * 显示消息对话框
   */
  async showMessage(
    msg: string,
    options?: { title?: string; kind?: 'info' | 'warning' | 'error' }
  ): Promise<void> {
    await message(msg, {
      title: options?.title ?? 'Novella AI',
      kind: options?.kind ?? 'info',
    });
  }

  /**
   * 显示确认对话框
   */
  async showConfirm(msg: string, title?: string): Promise<boolean> {
    return confirm(msg, { title: title ?? '确认' });
  }

  /**
   * 显示询问对话框
   */
  async showAsk(msg: string, title?: string): Promise<boolean> {
    return ask(msg, { title: title ?? '询问' });
  }

  // ========== 通知 ==========

  /**
   * 发送系统通知
   */
  async notify(title: string, body: string): Promise<void> {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }

    if (permissionGranted) {
      await sendNotification({ title, body });
    }
  }

  // ========== 视频处理 ==========

  /**
   * 剪辑视频
   */
  async clipVideo(options: VideoClipOptions): Promise<void> {
    await invoke('cut_video', options);
  }

  /**
   * 生成预览
   */
  async generatePreview(options: PreviewOptions): Promise<string> {
    return invoke<string>('generate_preview', options);
  }

  /**
   * 导出视频（带进度回调）
   */
  async exportVideo(options: ExportOptions, onProgress?: ExportProgressCallback): Promise<void> {
    const exportId = options.exportId ?? `export_${Date.now()}`;

    // 如果提供了回调，设置事件监听
    let unlisten: UnlistenFn | undefined;
    if (onProgress) {
      unlisten = await listen<ExportProgress>('export-progress', (event) => {
        if (event.payload.exportId === exportId) {
          const p = event.payload;
          onProgress({
            exportId: p.exportId,
            stage: p.stage as ExportProgress['stage'],
            progress: p.progress,
            message: p.message,
            error: p.error,
          });
        }
      });
    }

    try {
      await invoke('export_video', {
        ...options,
        exportId,
      });
    } finally {
      // 清理事件监听
      if (unlisten) {
        unlisten();
      }
    }
  }

  /**
   * 监听导出进度事件
   */
  async onExportProgress(callback: ExportProgressCallback): Promise<UnlistenFn> {
    return listen<ExportProgress>('export-progress', (event) => {
      const p = event.payload;
      callback({
        exportId: p.exportId,
        stage: p.stage as ExportProgress['stage'],
        progress: p.progress,
        message: p.message,
        error: p.error,
      });
    });
  }

  /**
   * 清理临时文件
   */
  async cleanTempFile(path: string): Promise<void> {
    await invoke('clean_temp_file', { path });
  }

  /**
   * 检查运行时依赖（WebView2 / FFmpeg）
   */
  async checkRuntimeDependencies(): Promise<Record<string, unknown>> {
    try {
      if (
        typeof window === 'undefined' ||
        !('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
      ) {
        return { webview2_installed: true, is_tauri: false };
      }
      return await invoke('check_runtime_dependencies');
    } catch (error) {
      logger.warn('检查 Runtime 依赖失败/非 Tauri 环境:', error);
      return { webview2_installed: true, is_tauri: false };
    }
  }

  /**
   * 分析视频文件获取元数据
   * 调用 Rust 端 analyze_video 命令
   */
  async analyzeVideo(path: string): Promise<{
    duration: number;
    width: number;
    height: number;
    fps: number;
    codec: string;
    bitrate: number;
  }> {
    return invoke('analyze_video', { path });
  }

  /**
   * 提取关键帧
   * 调用 Rust 端 extract_key_frames 命令
   */
  async extractKeyFrames(path: string, count: number): Promise<string[]> {
    return invoke<string[]>('extract_key_frames', { path, count });
  }

  // ========== 窗口操作（通过 Rust 命令） ==========

  /**
   * 显示窗口
   */
  async showWindow(): Promise<void> {
    return invoke('show_window');
  }

  /**
   * 隐藏窗口
   */
  async hideWindow(): Promise<void> {
    return invoke('hide_window');
  }

  // ========== 全局快捷键 ==========

  /**
   * 注册全局快捷键
   * @param shortcut 快捷键，如 "CommandOrControl+Shift+M"
   * @param action 动作: "show" | "hide" | "toggle"
   */
  async registerGlobalShortcut(
    shortcut: string,
    action: 'show' | 'hide' | 'toggle'
  ): Promise<void> {
    return invoke('register_global_shortcut', { shortcut, action });
  }

  /**
   * 注销全局快捷键
   */
  async unregisterGlobalShortcut(shortcut: string): Promise<void> {
    return invoke('unregister_global_shortcut', { shortcut });
  }

  /**
   * 检查 FFmpeg 是否已安装并获取版本信息
   */
  async checkFFmpeg(): Promise<{ installed: boolean; version?: string }> {
    try {
      if (
        typeof window === 'undefined' ||
        !('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
      ) {
        return { installed: true, version: 'Web/WASM Mode' };
      }
      const result = await invoke<Record<string, unknown>>('check_ffmpeg');
      return {
        installed: Boolean(result.installed),
        version: result.version as string | undefined,
      };
    } catch (error) {
      logger.warn('检查 FFmpeg 失败/非 Tauri 环境:', error);
      return { installed: false };
    }
  }

  /**
   * 检查快捷键是否已注册
   */
  async isGlobalShortcutRegistered(shortcut: string): Promise<boolean> {
    return invoke('is_global_shortcut_registered', { shortcut });
  }
}

// 导出单例
export const tauriService = new TauriService();
export default TauriService;
