---
type: design
status: reviewed
date: 2026-08-22
topic: editor-truthful-workflow
---

# 编辑器真实工作流设计

## Overview

本设计修复项目编辑器的真实性和可恢复性。架构、UI/UX、持久化与测试适用；API、数据库、安全、可观测性显式省略，因为不增加服务端接口、表或认证边界。

## Existing-Project Evidence

- verified: `CharacterDesigner` 已包含基本信息、外观、服装、性格和保存回调。
- verified: `generateImage` 已集中处理配置化图片服务的请求与错误。
- verified: `collaborationService` 提供评论、版本、差异、回滚和 `hydrate`。
- verified: loader 已读取 `storyboardFrames`、`storyboardComments`、`storyboardVersions`，但 Provider 初始化未恢复全部运行期状态。
- reuse: 复用以上组件与服务，不增加依赖或新抽象。

## Architecture

### ADR-001 手动角色与 AI 草稿双路径

`StepCharacter` 直接持有已确认角色数组。`CharacterDesigner.onSave` 追加或替换用户手动角色；AI Sheet 的 `onApply` 只写入待确认草稿，既有确认保存动作才覆盖工程角色。

### ADR-002 分镜仅使用真实工程状态

`StoryboardEditor` 的唯一帧源为 `initialFrames`。空数组进入空态；当前帧缺失时禁用编辑/生成操作。图片生成调用 `generateImage`，并仅在 promise 成功后经 `onChange` 回写该帧。

### ADR-003 协作状态加载即 hydrate

Provider 将 loader 的帧、评论、版本转换为各自既有类型，写入 storyboard store，并调用 `collaborationService.hydrate(projectId, comments, versions)`。面板从 Context 的工程 ID 读取评论，不能自行推断或硬编码 undefined。

## UI/UX

### ST-001 角色手动创建

角色区域在任何数据状态下显示“手动创建角色”表单。AI 入口与其同屏存在，AI 草稿确认前不覆盖手动已保存角色。

### ST-002 空分镜

无帧时显示中文空态和进入分镜 SSE 助手的入口，不显示示例场景、时间码、伪画面或伪音轨。

### ST-003 图片与视频状态

图片生成中按钮禁用；成功显示返回图片；失败保留原图并显示错误。视频区有 `videoUrl` 使用原生 `<video controls>`，否则为无播放控件的中文空态。

### ST-004 协作操作

添加评论立即可见。快照、比较和回滚通过已持久化的版本数据工作，刷新工程后继续可用。

## Data

### T-001 工程协作数据

持久化字段继续使用 `storyboardFrames`、`storyboardComments`、`storyboardVersions`，无迁移。它们的类型收窄只发生在加载边界，非法/缺失值按空数组处理。

## Cross-Dimension Mapping

| UI state      | Data/service                    | Test case      |
| ------------- | ------------------------------- | -------------- |
| ST-001        | CharacterDesigner, project save | TC-001         |
| ST-002/ST-003 | StoryboardFrame, generateImage  | TC-002, TC-003 |
| ST-004        | collaborationService, T-001     | TC-004         |
| 深色中文界面  | editor class names              | TC-005         |

## Test Cases

### TC-001 手动角色保存

无角色时渲染表单；保存后回调得到含 ID 的角色且不依赖 AI。

### TC-002 空态不回退到演示帧

传入空数组时不渲染 demo 标题或外部示例图片。

### TC-003 图片生成结果隔离

mock `generateImage` 成功时只更新选中帧 URL；拒绝时帧不变并出现错误。

### TC-004 协作加载恢复

Provider/服务 hydrate 后，按工程与帧读取评论，保存版本可比较和回滚。

### TC-005 浏览器可读性

编辑页中文工作台、深色输入框、角色表单和空态在桌面与窄屏下无横向溢出或 console error。
