<!-- ae-codex: durable memory -->

# 新建工程 AI 上下文与随机灵感

## 稳定契约

- `ProjectData` 的 `artStyle?: string` 和 `aspectRatio?: '16:9' | '9:16'` 是创建页元信息，必须以可选字段兼容历史项目。
- `CreateProjectModal` 属于 shared 层，只负责表单、SSE 文本拼接、JSON 解析、本地兜底和创建提交；AI service 通过注入回调提供。
- `AICreateProjectModal` 属于 feature 层，负责调用 `aiService.streamConfiguredDialogue`，消息只包含标题、概要、视觉画风和目标画幅。
- 模型输出契约：`{"name":"工程标题","description":"剧情概要"}`；结果只回填表单，不能自动创建或覆盖用户确认数据。
- 角色、脚本、分镜、项目详情助手必须携带视觉画风和目标画幅；旧项目缺失时使用“未设置”。

## 验证基线

- focused Jest：3 suites / 10 tests passed。
- `pnpm run build:check`：passed。
- 真实供应商 SSE、浏览器截图和 Rust 桌面端编译不属于本次自动验证范围。

## 相关路径

- `src/shared/components/project/CreateProjectModal.tsx`
- `src/features/project/components/AICreateProjectModal.tsx`
- `src/stores/slices/projectSlice.ts`
- `src/pages/project-edit/components/StepCharacter.tsx`
- `src/pages/project-edit/components/StepScript.tsx`
- `src/pages/project-edit/components/StepStoryboard.tsx`
- `src/pages/project-detail/ProjectDetailPage.tsx`
