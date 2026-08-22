---
type: plan
status: implemented
date: 2026-08-22
title: ai-assisted-creative-and-video-materials
origin: docs/ae/prds/ai-assisted-creative-and-video-materials-2026-08-22.md
originFingerprint: ai-assisted-creative-and-video-materials-2026-08-22
depth: deep
format: human-readable-plan
sharded: false
---

# AI 辅助创作与远程视频素材链路实施计划

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Plan Readiness

- Requirements: `docs/ae/prds/ai-assisted-creative-and-video-materials-2026-08-22.md`
- Decision drivers: 保留用户确认数据、复用现有服务、明确外部协议边界。
- Open decisions: 云存储上传厂商和正式 Script schema 延后，不阻塞本轮。
- Validation contract: focused tests, TypeScript/build, browser acceptance with network interception; no real paid generation.

## Alternatives

1. 在现有页面各自补请求：改动快，但会复制 AI 调用、草稿和错误处理，后续模型协议继续分叉。
2. 推荐：新增少量纯函数/服务层，页面只负责草稿状态和确认动作；集中构建视频请求并复用现有配置。Fit 最好，测试边界清晰，兼容旧字段。
3. 引入全新工作流状态机和云存储平台：长期能力更强，但超出本轮且会引入迁移、凭证和运维风险。

## Pre-mortem

- 生成结果仍然只存在组件内存：通过确认后刷新页面的浏览器验收发现；恢复信号是禁止把该步骤标记完成。
- 本地路径误发到远程：请求构建测试检查 URL 协议和 Windows 路径；恢复信号是远程调用前硬失败。
- 模型字段互相串线：逐模型 snapshot/断言发现未知字段；恢复信号是回退到旧 serializer 并禁用高级字段。

## Implementation Units

### U1. 锁定请求构建和素材引用行为

- Requirements: R5, R6, R7, R8, NFR1, NFR2
- Acceptance covered: 图片/视频/音频归集去重；本地素材阻断；Grok multipart 文件引用；V3/MiniMax/Video-V2 参数映射。
- Depends on: none
- Owned files:
  - `src/core/services/ai/video/remote-video-types.ts`
  - `src/core/services/ai/video/remote-video-service.ts`
  - `src/core/services/ai/image/image-generation/types.ts`
  - `src/core/services/ai/image/image-generation-service.ts`
  - `src/core/services/ai/video/*test*`
- Forbidden files: provider credentials, unrelated settings UI, generated output.
- Work: 扩展统一参数类型；抽出可测试的 `buildVideoGenerationRequest`、`resolveVideoReferences`；实现公网 URL 校验、Grok `input_reference` Blob 追加、V3 高级字段及传入 character references；保持旧参数兼容。
- Validation: 先写并运行失败测试；相关 Jest/Vitest 测试；TypeScript。
- Rollback signals: 任何旧模型 payload snapshot 变化且无需求解释，立即回退 serializer 改动。
- Deferred: 上传到对象存储的真实 adapter。

### U2. 打通项目正文到脚本/角色/分镜草稿

- Requirements: R1, R2, R3, R4, NFR2, NFR3
- Acceptance covered: 正文自动作为输入；AI 结果草稿态；确认后持久化；旧项目可读取。
- Depends on: none
- Owned files:
  - `src/pages/project-detail/hooks/useProjectDetail.ts`
  - `src/pages/project-detail/hooks/projectDetailActions.ts`
  - `src/pages/project-detail/ProjectDetailPage.tsx`
  - `src/pages/project-edit/context/project-edit-state.ts`
  - `src/pages/project-edit/context/ProjectEditContext.tsx`
  - `src/pages/project-edit/context/useProjectEditActions.ts`
  - `src/pages/project-edit/context/selectors.ts`
  - `src/pages/project-edit/components/StepAnalysis.tsx`
  - `src/pages/project-edit/components/StepScript.tsx`
  - `src/pages/project-edit/components/StepCharacter.tsx`
  - `src/core/services/ai/text/*`
- Forbidden files: settings provider storage format, unrelated header/layout changes.
- Work: 从正文和 story analysis 建立 prompt builder；通过 `aiService.streamGenerate` 逐 chunk 写入脚本、角色、分镜草稿和可见的 AI 回复区。流结束后再解析结构化角色/分镜数据，提供编辑、确认、取消；确认调用既有项目持久化；去掉固定 `INITIAL_SHOTS` 作为默认数据，保留空状态。
- Validation: 先写 OpenAI/Anthropic SSE 与 abort 行为测试；组件测试或 hook 测试；TypeScript/build；浏览器验证正文输入、流式草稿预览、取消和刷新后的确认数据。
- Rollback signals: 已有项目打开后脚本/角色丢失或旧 JSON 无法读取。
- Deferred: 完整多轮聊天记录和云端协同。

### U3. 记录流程与运行证据

- Requirements: NFR1, NFR2
- Acceptance covered: 错误可定位、密钥不泄露、验证证据可追溯。
- Depends on: U1, U2
- Owned files:
  - `docs/00-process/active/ai-assisted-creative-and-video-materials-2026-08-22/progress.md`
  - `docs/ae/reviews/ai-assisted-creative-and-video-materials-2026-08-22.md`
- Forbidden files: secrets, `.env`, generated bundles.
- Work: 记录命令、测试结果、浏览器关键观察；完成 reviewer/architect 双泳道代码审查。
- Validation: `pnpm exec tsc --noEmit`, focused tests, `pnpm build`, ESLint, browser acceptance.
- Rollback signals: 无法区分本轮失败和既有失败时暂停交付，不宣称通过。

## Evidence Matrix

| Acceptance criterion | Tier                   | Expected proof                                              | Owner | Status     | Recovery                                        |
| -------------------- | ---------------------- | ----------------------------------------------------------- | ----- | ---------- | ----------------------------------------------- |
| R5-R8                | Focused automated test | serializer/reference tests pass                             | U1    | unverified | restore old payload builder                     |
| R1-R4                | Focused automated test | draft/confirm persistence tests pass                        | U2    | unverified | restore prior editor state                      |
| R9-R11               | Focused automated test | OpenAI/Anthropic SSE chunks, abort and draft isolation pass | U2    | unverified | disable stream action and retain confirmed data |
| R1-R8                | Integration or build   | typecheck/build pass                                        | U1/U2 | unverified | stop before browser acceptance                  |
| R1-R6                | Browser acceptance     | visible draft/confirm/error and intercepted request         | U3    | unverified | retain old navigation                           |

## Rollback And Recovery

- 所有新增字段保持 optional；读取旧项目时使用现有 `content`/`script`/`novelText` 优先级。
- 远程请求构建函数保留旧模型分支，任何协议不确定时拒绝发送而不是猜测。
- 页面生成失败时只清理草稿 loading 状态，不清除用户已确认数组。

## Plan Self-Review

- 每个 PRD requirement 均映射到 U1/U2/U3 或验证矩阵。
- 新增范围仅限现有服务和页面边界，没有引入新依赖或云存储供应商。
- 真实远程调用明确不在本轮验证，浏览器测试使用请求拦截。
- 计划状态：ready for implementation after document review and Git/worktree gate。
