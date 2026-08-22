---
type: prd
status: implemented
date: 2026-08-22
topic: editor-truthful-workflow
format: human-readable-requirements
sharded: false
---

# 编辑器真实工作流与手动创作

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem Frame

项目编辑页把角色手动创建入口隐藏为仅 AI 草稿，并将示例分镜、静态预览和定时替换图片呈现为可操作的创作流程。同时，评论读取不到工程 ID，评论和版本即使被写入工程也不能在重新打开时恢复。用户需要 AI 助手与手动表单并存，且界面必须如实说明数据与生成状态。

## Requirements

- R1. 角色步骤始终提供完整的手动角色创建表单，保留已确认角色的编辑与参考图操作；AI 侧边助手只产生待确认草稿，不能替代手动路径。
- R2. 分镜编辑器在没有工程分镜时显示中文空态，不展示赛博街景或第三方图片作为示例数据；所有显示的分镜均来自工程数据或用户确认的草稿。
- R3. “生成当前画面”调用已有的 `generateImage` 服务并把成功返回的 URL 写入当前分镜；未配置、失败或无选中分镜必须保留原数据并展示真实错误状态。
- R4. 分镜预览仅在当前分镜存在真实 `videoUrl` 时提供视频播放；其他情况下显示“暂无生成视频”，不得用静态图片和播放按钮伪装视频。
- R5. 评论列表使用当前工程 ID，保存快照、差异与回滚继续使用既有协作服务；工程加载时恢复分镜、评论与版本数据，并对协作服务做同工程 hydrate。
- R6. 分镜工作台面向用户的标题、动作和空状态均为中文；深色工作台中的输入框、文本域、下拉控件具有可辨识的前景、边框和占位符对比度。
- R7. 已存在的 SSE 创作助手保持 feature 级复用，由调用表单决定解析和回填目标；不引入会丢失回填归属的全局单例。

## Acceptance Criteria

- AC1: 无角色工程可见“创建角色”表单，同时可打开角色 AI 助手；保存手动角色后角色出现在已确认列表。
- AC2: 空分镜工程不显示演示分镜或演示图片；有真实分镜时仅显示其自身数据。
- AC3: 图片生成成功后只更新选中分镜的 `imageUrl`；服务拒绝或失败时不替换现有图片。
- AC4: 有 `videoUrl` 时预览可播放该 URL；没有时没有可点击的伪播放控件。
- AC5: 添加评论后当前镜头立即可见；保存的评论和版本在重新加载同一工程后可查询、比较和回滚。
- AC6: 分镜区不再出现英文操作文案，深色输入区域文本与边界可读。

## Scope Boundary

### In Scope

- 项目编辑页角色、分镜和协作面板的前端状态、持久化恢复、中文化和可读性。
- 已有图片生成服务的真实客户端接入和 mock 测试。

### Out Of Scope

- 真实模型付费请求、视频生成 API 的新平台接入、上传资产协议和聊天记录持久化。
- 重做 AI 助手协议、工程文件格式迁移或多人实时同步。

## Decisions

- D1: 使用现有 `CharacterDesigner` 恢复手动表单，避免再造一套角色字段与校验。
- D2: 真实空态优于静态演示；未经用户导入或 AI 确认的数据不进入编辑画布。
- D3: 视频预览只承认 `videoUrl`，图片只表示画面参考。
- D4: 协作状态以工程数据为持久化来源，`collaborationService` 是运行期索引并在加载时 hydrate。

## Validation Evidence

| Requirement                    | Proof                           | Expected signal                          | Status     |
| ------------------------------ | ------------------------------- | ---------------------------------------- | ---------- |
| R1                             | Component test and browser flow | 手动保存与 AI 助手并存                   | planned    |
| R2-R4                          | Unit/component test             | 无 demo 回退，生成仅走服务，视频状态诚实 | planned    |
| R5                             | Service/context test            | 工程 ID、hydrate、评论与版本恢复         | planned    |
| R6                             | Browser check                   | 中文文案与深色输入可读                   | planned    |
| Authenticated image generation | Explicit user-approved smoke    | 配置服务实际返回图片                     | unverified |

## Open Questions

- 无阻塞问题。真实图片服务的认证验证明确延后，避免在自动化中发送用户密钥。
