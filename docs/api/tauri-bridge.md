# Tauri Bridge

Tauri bridge 将桌面能力封装为 TypeScript facade。入口是 `@/infrastructure/tauri-bridge/commands`，在服务 barrel 中也可通过 `tauriService` 使用。

## 能力范围

- 项目文件读写、文件打开/保存和目录读取
- 视频剪辑、预览、导出和导出进度监听
- 视频分析、关键帧提取和 FFmpeg 可用性检查
- 临时文件清理、窗口、通知和快捷键操作
- 桌面端配置对话 SSE：`streamConfiguredDialogue` 通过 Rust command 和 `novella://dialogue/*` 事件传输，支持 `AbortSignal` 取消

## 选项类型

公开类型包括 `OpenFileOptions`、`SaveFileOptions`、`VideoClipOptions`、`PreviewOptions`、`ExportOptions`、`ExportProgress` 和 `DirInfo`。视频输入输出使用本地路径，时间值使用秒。

```ts
import { tauriService } from '@/core/services';
import type { OpenFileOptions } from '@/infrastructure/tauri-bridge/commands';

const options: OpenFileOptions = {
  title: '选择视频',
  multiple: false,
  filters: [{ name: '视频', extensions: ['mp4', 'webm', 'mov'] }],
};

const path = await tauriService.openFile(options);
```

具体方法名和返回值以 `src/infrastructure/tauri-bridge/commands.ts` 的导出为准；新增命令时需要同步 Rust command、TypeScript 类型、错误处理和桌面端测试。浏览器预览或单元测试环境不能假设 Tauri runtime 一定存在，应提供 mock 或能力检测。

## 配置对话 SSE

`tauriService.streamConfiguredDialogue(request, signal)` 只应由 `aiService.streamConfiguredDialogue` 调用。Tauri runtime 中，Rust 校验 HTTPS endpoint 后发起 SSE，并通过以下事件返回数据：

- `novella://dialogue/chunk`：文本分片
- `novella://dialogue/complete`：流结束或取消
- `novella://dialogue/error`：脱敏的 HTTP/传输错误

API key 仅作为 IPC 请求字段进入 Rust 请求内存，不写入事件、日志或项目会话。Web/Vite 模式不调用该方法，而是使用受限本地代理或原始 Provider 请求。
