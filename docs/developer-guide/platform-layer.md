# 平台适配层

> Tauri 桌面端集成

## 桌面功能

| 功能       | 说明                       |
| ---------- | -------------------------- |
| 原生窗口   | 自定义标题栏 + 透明背景    |
| 系统托盘   | 最小化到托盘 + 快捷操作    |
| 全局快捷键 | 自定义截图/开始/停止快捷键 |
| 文件拖放   | 拖入文件自动导入           |
| 原生通知   | 步骤完成/失败系统通知      |
| 文件系统   | 本地读写 + 目录选择        |

## 双模式架构

```
Web 模式 (pnpm dev)
  纯浏览器运行，无桌面集成
  用于 UI 预览 + 开发调试

桌面模式 (pnpm tauri dev)
  Tauri WebView2 运行
  完整桌面集成（窗口/托盘/快捷键/通知）
```

## 环境检测

```typescript
// shared/utils/environment.ts
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI__' in window;
}

// 使用示例
if (isTauri()) {
  // 使用 Tauri 原生 API
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('compose_video', { scenes, options });
} else {
  // 使用 FFmpeg.wasm 浏览器版本
  await ffmpegWasmService.compose(scenes, options);
}
```

## 对话传输双模式

- Web：`pnpm dev` 走 Provider 直连，或显式开启受限 Vite 代理（见 [服务连接](./service-connections)）。
- 桌面：`pnpm tauri dev` 走 `src-tauri/src/commands/dialogue.rs` 的 HTTPS SSE，前端订阅 `novella://dialogue/*`。不要用浏览器打开开发服务器地址代替 Tauri 窗口验收。

`tauri.conf.json` 的 CSP `connect-src` 含 `https:`，设置里保存的自定义 HTTPS 对话地址才能连通。API key 只进入 native 请求内存，不进 IPC 事件或日志。

## FFmpeg 双模式

桌面端优先使用系统 FFmpeg（原生性能），缺失时自动降级到 FFmpeg.wasm。

[下一步：部署文档 →](/deployment/)
