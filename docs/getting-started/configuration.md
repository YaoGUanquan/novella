---
title: 配置 API Key
description: 配置 AI Provider API Key 和模型参数
category: getting-started
version: '>=2.2'
---

# 配置 API Key

> 至少配置对话模型才能使用创作助手；图片和视频连接按需填写。设置页不再按七家 Provider 分卡。

---

## 配置方式

### 图形界面

进入 `设置`，分别填写「对话模型」「图片生成模型」「视频生成模型」的地址、API Key 和模型 ID。策略由模型名内部选择，页面不展示 Secret、超时或 JSON 映射。

### 环境变量

```bash
# .env 文件
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
ZHIPU_API_KEY=...
DASHSCOPE_API_KEY=...    # 阿里云
BAIDU_API_KEY=...
BAIDU_API_SECRET=...     # 百度需要 Secret
```

## Provider 配置表

| Provider  | 必需变量                             | 可选变量             | 默认模型        |
| --------- | ------------------------------------ | -------------------- | --------------- |
| OpenAI    | `OPENAI_API_KEY`                     | `OPENAI_BASE_URL`    | gpt-4           |
| Anthropic | `ANTHROPIC_API_KEY`                  | `ANTHROPIC_BASE_URL` | claude-4-sonnet |
| Google    | `GOOGLE_API_KEY`                     | —                    | gemini-2.5      |
| 智谱      | `ZHIPU_API_KEY`                      | —                    | glm-5           |
| 阿里      | `DASHSCOPE_API_KEY`                  | —                    | qwen-max        |
| 百度      | `BAIDU_API_KEY` + `BAIDU_API_SECRET` | —                    | ernie-4.0       |
| Mock      | —                                    | `MOCK_DELAY_MS`      | (模拟)          |

## Fallback Chain

当主 Provider 失败时，自动切换到下一个：

```typescript
// 配置示例
const config = {
  primary: 'openai',
  fallback: ['anthropic', 'zhipu', 'mock'], // 按顺序重试
  maxRetries: 3,
};
```

::: tip Mock Provider
不配置任何 API Key 时，自动使用 Mock Provider（模拟生成），用于 UI 预览和流程测试。
:::

## 模型参数

```typescript
// 温度（创意度）
temperature: 0.3; // 分析任务（精确）
temperature: 0.7; // 创作任务（平衡）
temperature: 0.9; // 创意任务（发散）

// Token 限制
max_tokens: 2000; // 标准任务
max_tokens: 4000; // 复杂任务
```

[下一步：了解工作流 →](/user-guide/workflow-overview)
