---
type: review
status: approve
date: 2026-08-22
scope: implementation
domain: code
---

# 编辑器真实工作流代码评审

## Findings

无阻塞发现。

## Reviewer Lane

- 角色手动保存、AI 草稿确认、图片生成失败路径和空分镜路径均不伪造结果。
- 协作面板使用 Provider 暴露的实际工程 ID；工程加载恢复帧、评论与版本，并只 hydrate 对应工程的数据。
- `StoryboardEditor` 的异步图片回写绑定请求开始时选中的 frame ID，避免切换选中镜头后写错素材。
- 版本保存使用默认标签回退、仅列出分镜类型版本，并将最新快照设为默认比较目标。

Verdict: APPROVE

## Architect Lane

- 沿用 `CharacterDesigner`、`generateImage`、`collaborationService` 和 feature 级 `AICreativeAssistantSheet`，没有新增依赖或全局单例。
- 删除了默认演示帧和伪播放界面，减少了将静态样例误认为真实工程数据的风险。
- Provider 的恢复 effect 有工程/数据键保护，避免 Zustand 更新引发的重复 hydrate 循环。

Verdict: APPROVE

## Evidence

- `pnpm exec jest --runInBand src/__tests__/features/storyboard/StoryboardEditor.test.tsx src/__tests__/services/collaboration.service.test.ts`: 2 suites / 7 tests passed.
- `pnpm exec tsc --noEmit`, scoped ESLint, `git diff --check` and `pnpm run build`: passed.
- Browser: 手动角色表单、角色 AI Sheet 均可见；重新加载后没有新增最大更新深度错误。

## Remaining Verification Gap

- 未向用户已保存的图片服务发送真实请求；认证模型响应、视频 URL 回写的上游生成流程仍需用户在已配置环境中手动验证。
