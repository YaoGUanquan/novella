# 创作助手项目记忆进度

## 2026-08-22

- 已确认方案一：只增强 Novella 产品内创作助手，不安装外部开发代理技能。
- 已完成：需求与计划记录；项目记忆类型、localStorage 读写、状态标记解析和 prompt contract；Sheet 的记忆展示、确认保存、清除和候选稿隔离；纯逻辑与组件回归测试。
- 已验证：`pnpm exec jest --runInBand src/__tests__/features/creative-assistant`（10 passed）；`pnpm exec jest --runInBand src/__tests__/services/configured-dialogue-stream.test.ts src/__tests__/services/ai-connection-settings.test.ts`（6 passed）；`pnpm exec tsc --noEmit`；`pnpm exec eslint src/features/creative-assistant --quiet`；`pnpm run build`。
- 补充验证：新增状态记忆回归后，`pnpm exec jest --runInBand src/__tests__/features/creative-assistant`（10 passed）；全量 `pnpm exec jest --runInBand` 为 67 suites passed / 1 existing unrelated SettingsPage suite failed（`github-issues-resolution.test.tsx` 期望 `novella_working_dir` 写入但实际为 null）。
- 2026-08-22 续修：未闭合 `<novella-state>` 不再污染气泡；助手正文按空行分段并保留换行。聚焦测试 15/15，`tsc --noEmit` 通过。
- 未验证：真实模型请求、CORS、Tauri 桌面端安全存储、真实多模态供应商能力。
- 注意：对新增测试目录执行全量 eslint 时，已有 `AICreativeAssistantSheet.test.tsx:157` 的 async generator `require-yield` 规则报错；不影响 Jest、TypeScript、生产代码 scoped lint 或构建。
