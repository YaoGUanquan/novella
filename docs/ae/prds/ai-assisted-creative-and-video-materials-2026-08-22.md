---
type: prd
status: implemented
date: 2026-08-22
topic: ai-assisted-creative-and-video-materials
format: human-readable-requirements
sharded: false
---

# AI 辅助创作与远程视频素材链路

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem Frame

当前项目详情页能展示导入内容，但内容没有稳定进入脚本、角色和分镜的可编辑生成链路；项目编辑页存在占位脚本和角色设计器，用户无法确认 AI 草稿后再持久化。远程视频服务只传单张参考图，未归集分镜/角色素材，也没有把本地素材转成第三方可访问地址，部分模型协议字段未被传递。

本轮目标是让用户从项目内容出发，获得可编辑、可确认的脚本/角色/分镜草稿，并让已确认的图片素材以明确的引用链路进入远程视频请求。成功信号是：生成前能看到请求使用的模型、参数和素材；本地不可公开访问的素材不会被静默发送。

## Requirements

### SSE 流式创作修订（2026-08-22）

- R9. 脚本、角色与分镜的 AI 创作入口必须通过现有对话服务的 SSE 逐段接收结果；收到每个 chunk 后，草稿视图应立即更新，不能等完整响应结束后才展示。
  Acceptance: 在被拦截的流式响应中，首个 chunk 到达时草稿区已出现文本；最终结构化草稿仅保存在临时状态。
- R10. 对话服务的 OpenAI 和 Anthropic 协议均须使用其原生流式响应；取消操作必须中止请求并保留已接收的草稿，不得覆盖已确认项目数据。
  Acceptance: OpenAI `data:` delta 与 Anthropic `content_block_delta` 均能产出文本 chunk；取消后不再追加文本，且已确认脚本、角色、分镜保持不变。
- R11. 用户的创作要求是对话输入而非结构化内容的直接填写；脚本、角色和分镜在流完成后才允许编辑、确认并持久化。
  Acceptance: 每个入口都有创作要求和生成/取消操作；生成中展示 AI 回复，确认是唯一写入工程数据的路径。

**内容到创作草稿**

- R1. 项目内容（`content`、兼容的 `novelText` 或 `script`）进入项目编辑流程时，应自动作为分析、脚本、角色和分镜生成的输入源。  
  Acceptance: 仅有项目正文而没有 `scripts` 时，脚本步骤显示由正文派生的可编辑草稿，而不是空白或固定示例。
- R2. “AI 优化/生成脚本”必须调用已配置的对话服务，结果先显示为草稿，用户可编辑、确认或放弃。  
  Acceptance: 对话请求包含项目正文和明确的输出格式约束；未点击确认前，原有已确认脚本不被覆盖。
- R3. 角色步骤提供基于正文/分析结果的角色预览、编辑和再次 AI 优化；确认后的角色数据持久化到项目。  
  Acceptance: 首次生成结果可在表单中修改，确认后刷新页面仍保留修改；没有密钥时给出可理解的配置错误。
- R4. 分镜/脚本步骤允许用户基于对话结果调整镜头、对白、画面提示词，并在确认后用于后续图片/视频生成。  
  Acceptance: 分镜草稿不是只存在组件内存，确认后写入项目的脚本或 `storyboardFrames` 数据。

**图片和视频素材链路**

- R5. 生成视频时归集已确认分镜图片、角色参考图和显式参考素材，去重后按远程模型协议传递。  
  Acceptance: 请求预览或拦截测试能看到所有有效图片引用；未被引用的本地资产不会被发送。
- R6. 本地文件在没有公网 URL 或配置的上传适配器时，生成前必须阻断并说明原因；不得把 `file://`、Windows 路径、Blob 临时地址或 base64 当作公网 URL 发送。  
  Acceptance: 本地素材触发明确错误状态；已有公网 URL 的素材可继续请求。
- R7. 远程视频适配器支持当前文档中已使用的 `video-v2`、`video-v2-fast`、`video-v3`、Grok 和 MiniMax 的必要字段，并保留未知扩展字段的明确边界。  
  Acceptance: 单元测试覆盖 JSON 图片/视频/音频数组、V3 高级参数以及 Grok multipart `input_reference`；不同模型不会发送互相冲突的字段。
- R8. 视频生成参数（模型、时长、比例、分辨率、音频开关、seed、脸部校验、grid strength、起止帧等）在请求构建层集中定义，并能从调用方传入。  
  Acceptance: 参数在请求构建测试中可观察，未设置的可选参数不会被序列化。

## Non-Functional Requirements

- NFR1. 密钥只从现有安全配置读取，日志、错误和测试输出不得包含密钥或完整授权头。  
  Acceptance: 相关测试和浏览器控制台检查不出现密钥值。
- NFR2. 生成失败、超时、素材不可用和协议不匹配都要有可定位的错误信息，且不破坏已确认项目数据。  
  Acceptance: 失败路径保留草稿和原数据，测试能断言错误类别。
- NFR3. 现有项目 JSON 和旧服务配置保持可读取。
  Acceptance: 既有项目 fixture 和配置兼容测试通过。
- NFR4. AbortSignal 只在 transport 层传递，不能被序列化到请求正文或输出到日志。
  Acceptance: SSE 请求 JSON 不包含 `signal`，且取消时浏览器网络请求处于 aborted 状态。

## Must-Haves (Conditional)

- Requirement ID: R2
  Must-have completion condition: AI 结果必须先进入草稿态，确认动作是唯一写入已确认脚本的路径。
- Requirement ID: R6
  Must-have completion condition: 任何本地不可公开访问素材在请求前被阻断，且错误可见。
- Requirement ID: R7
  Must-have completion condition: Grok multipart 与 V3/Video-V2 JSON 请求均有自动化覆盖。

## Success Criteria

- 从项目正文可以生成并确认脚本、角色和分镜，刷新页面后数据仍在。
- 远程视频请求能展示/测试实际使用的图片素材和高级参数。
- 本地素材缺少上传能力时不会产生错误的公网 URL 请求。
- TypeScript、相关测试、构建和浏览器关键流程验证通过。

## Scope Boundary

### In Scope

- 项目详情/编辑页内容到脚本、角色、分镜的草稿、确认和持久化链路。
- 远程视频请求构建、素材引用归集、URL 能力校验和当前文档协议适配。
- 针对上述行为的纯函数/服务测试和浏览器拦截验证。

### Out Of Scope

- 本轮不接入新的云存储厂商或购买/部署公网对象存储。
- 不改变对话模型供应商协议范围，继续支持 OpenAI/Anthropic 两种格式。
- 不在未明确要求时触发真实付费图片/视频生成。
- 不重做整个项目编辑器视觉设计。

### Constraints

- 复用现有 `aiService`、安全配置、项目 store 和 Tauri 持久化。
- 遵守远程文档对公网 URL、multipart 文件和模型字段的限制。
- 保留当前工作区中已有用户改动。

## Validation Evidence

| Acceptance criterion       | Applicable tier             | Expected signal and bounded claim              | Preconditions / owner    | Status         | Recovery or rollback signal |
| -------------------------- | --------------------------- | ---------------------------------------------- | ------------------------ | -------------- | --------------------------- |
| R1-R4 草稿生成和确认持久化 | Focused automated test      | 草稿不覆盖已确认数据，确认后项目字段更新       | 本地测试 harness / Codex | unverified     | 回滚草稿状态改动            |
| R5-R8 请求素材和协议字段   | Focused automated test      | 请求构建函数输出符合模型协议                   | 本地测试 harness / Codex | unverified     | 禁用远程网关并恢复旧序列化  |
| R6 本地素材阻断            | Integration or build        | 类型检查和服务测试阻断不可公开 URL             | 本地测试 harness / Codex | unverified     | 回退到仅允许公网 URL        |
| 用户可见创作流程           | Browser acceptance          | 浏览器看到草稿、确认、错误提示，网络请求可拦截 | 本地 Vite / 浏览器       | unverified     | 保留旧编辑入口              |
| 真实远程服务调用           | Authenticated service smoke | 仅在用户明确测试时验证受控请求                 | 用户提供的已保存配置     | not-applicable | 本轮不触发真实请求          |

## Perspective Collision (Conditional)

- Critic：自动覆盖会损坏用户已确认内容；因此必须采用草稿/确认双态。
- Pragmatist：先复用现有 AI 和项目 store，上传能力作为可选边界，不把云存储引入本轮。
- Innovator：角色参考图和分镜图应成为同一素材引用集合，减少重复配置。
- Systems：不同视频模型协议不能由单个宽泛 payload 隐式猜测，必须集中序列化并测试。

Collision insight：最小可交付不是“再加几个按钮”，而是建立草稿、确认、素材引用三个明确状态边界。Blind spot：实际上传服务的鉴权、生命周期和费用尚未确定。Thinking preservation zone：用户对最终脚本、角色设定和镜头顺序拥有最终确认权。

## Key Decisions

- D1. AI 生成采用“草稿 -> 用户确认 -> 持久化”流程。  
  Reason: 防止生成结果覆盖用户已确认内容，并支持反复优化。
- D2. 视频素材先做引用归集和可访问性校验，上传适配器保持可插拔但本轮不绑定具体云厂商。  
  Reason: 外部文档要求公网 URL，而当前桌面应用没有通用上传链路。
- D3. 视频协议序列化按模型集中处理，调用方只传统一参数对象。  
  Reason: 便于覆盖 V3、Video-V2、Grok、MiniMax 的差异并避免字段串线。

## Dependencies And Assumptions

### Dependencies

- 现有对话配置、图像配置、远程视频网关配置和 Tauri 项目存储。
- `https://image.kkone.vip/1/docs.html` 的当前协议约束。
- `D:/codes/ph-MoneyPrinterTurbo` 中已验证的本地素材处理经验。

### Assumptions

- 用户已保存的密钥可由现有 secure storage 读取，但本轮不读取或输出密钥内容。
- 远程视频服务接受文档中列出的公网 URL 和 multipart 形式。
- 当前项目的 `ProjectData` 可通过增加可选字段保持向后兼容。

## Open Questions

### Must Resolve Before Planning

- 无。用户已明确要求先修复链路，上传厂商选择可延后。

### Deferred To Planning

- Q1. 是否在后续阶段增加对象存储上传适配器及其生命周期/清理策略。
- Q2. 是否需要把分镜生成结果独立成正式 `Script` schema，还是继续兼容 `storyboardFrames`。

## Evidence Notes

- 当前远程视频只传 `referenceImage` 单图 -> Evidence: `src/core/services/ai/image/image-generation-service.ts`。
- Grok 请求创建 FormData 但未追加 `input_reference` -> Evidence: `src/core/services/ai/video/remote-video-service.ts`。
- 本地资产服务只保存本地 URL/路径 -> Evidence: `src/core/services/project/asset-service.ts`、`src/features/asset-library/index.ts`。
- MoneyPrinterTurbo 将本地素材落盘并校验路径，不把 Windows 路径直接交给外部服务 -> Evidence: `D:/codes/ph-MoneyPrinterTurbo/app/controllers/v1/remote_video.py` 及相关服务。

## Consistency Check

- requirementsCount: 8
- nonFunctionalRequirementsCount: 3
- decisionsCount: 3
- openQuestionsCount: 2
