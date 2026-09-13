# Novella 前端体验审计与本次优化报告

日期：2026-09-06  
范围：首页工作台、全局 focus/动效规则、项目工程列表  
实现方式：按 `$ae-lfg` 的审计、实现、验证、交付证据流程执行。

## 1. UI Direction Contract

| 维度                     | 本次约束                                                                                         | 证据标记                |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------- |
| Surface and job          | 首页是已登录创作工作台入口，任务是新建工程、进入向导、选择范例和继续项目，不做营销落地页。       | `verified`              |
| Baseline and assets      | 保留现有 dark cyberpunk/studio 基线、现有组件库和 Lucide 图标；本次不引入新动画库或新视觉系统。  | `verified`              |
| Hierarchy and typography | H1 说明创作场景，操作按钮紧随任务，项目区承担持续工作入口；移动端允许标题和操作自然换行。        | `inferred`              |
| Palette                  | 保留现有 cyan/indigo/dark palette，仅移除未经运行时证明的厂商/模型能力文案。                     | `verified` / `inferred` |
| Spacing and density      | 保持现有紧凑工作台密度；优先修复按钮压缩、触控发现和焦点可见性，不做大范围重排。                 | `verified`              |
| Expressiveness           | 使用现有工作流预览表达创作阶段，不新增营销式数字、GPU 或供应商承诺。                             | `inferred`              |
| Motion purpose           | 仅保留已有 hover/preview 动效；全局 focus 修复不依赖动效。后续动效必须服务状态、反馈或任务结果。 | `verified` / `assumed`  |
| Responsive intent        | 以窄屏不横向溢出、按钮文本不被压缩、操作可触控为最低目标；桌面保持原布局。                       | `verified`              |
| Avoid list               | 不新增玻璃拟态、渐变 hero、粒子背景、营销模板、动画库、路由/API/权限改动。                       | `verified`              |

## 2. Audit Findings

### FE-001 首页文案混入未验证能力

- 级别：`P1`
- 观察：原首页展示 “Gemini Studio 2026”、具体模型名称、GPU 压制比例、锁脸能力和多个供应商名称。
- 影响：供应商和模型后续会变化；静态页面文案会被误读为当前真实运行状态。
- 修复：改为“工作流预览”“可配置 Provider”“项目内复用”“任务可追踪”等能力类别；进度条改为阶段预览。

### FE-002 移动端首页 action row 溢出/压缩

- 级别：`P1`
- 观察：原操作区不换行；移动视口下“剧本范例”和“新建漫剧工程”越过可视范围，后续 flex 修复后中间按钮又出现文本压缩风险。
- 修复：操作区允许换行，按钮使用内容宽度 `flex-none`，保留桌面端自然排列。

### FE-003 工程卡片不可键盘操作

- 级别：`P1`
- 观察：项目卡片和新建工程卡片是 clickable `div`，没有 role、tabIndex 和键盘行为。
- 修复：增加 `role="button"`、`tabIndex={0}`、Enter/Space 激活和 aria-label。

### FE-004 删除操作缺少确认

- 级别：`P1`
- 观察：工程卡片删除按钮直接执行删除。
- 修复：删除前增加工程名称确认；取消确认不触发删除或 refresh。

### FE-005 触控设备发现性不足

- 级别：`P2`
- 观察：编辑/删除快捷栏只在 hover 显示。
- 修复：移动端保持快捷栏可见，桌面端继续使用 hover 显示，按钮保留 title。

### FE-006 全局 focus 被清除

- 级别：`P0`
- 观察：`src/styles/globals.css` 和后续输入规则曾将 `outline`、`box-shadow` 全局清零。
- 影响：键盘用户无法判断当前控件，属于可访问性阻断。
- 修复：恢复 `:focus-visible` 2px cyan outline 和 3px halo；pointer focus 不强制显示同样的 ring。

### FE-007 全局动效范围偏宽

- 级别：`P2`
- 观察：`src/app/styles/global.css` 与全局样式存在宽泛 transition/keyframes；本次未大范围清理，以避免视觉回归。
- 后续：将 transition 收敛到 transform/opacity/color/border 等明确属性，补 reduced-motion 浏览器验收。

### FE-008 页面状态覆盖不完整

- 级别：`P2`
- 观察：首页有 loading/empty，设置页有 loading、save disabled、success/error toast；项目列表缺少明确 error 状态，真实远程任务失败路径尚未在首页展示。
- 后续：统一 `loading/empty/error/disabled/success` 状态组件和 focused UI tests。

## 3. Implemented Changes

### [HeroSection.tsx](/D:/codes/ph-novella/src/features/home/components/HeroSection.tsx)

- 将首页标题和右侧信息改为当前能力类别/工作流预览文案。
- 移除具体模型、GPU、锁脸和供应商名等未验证静态承诺。
- 首页操作区支持窄屏换行；按钮使用内容宽度，避免中文被 flex 压缩。
- 未改变导航路径、创建工程 modal、剧本范例 modal 或播放状态逻辑。

### [ProjectGrid.tsx](/D:/codes/ph-novella/src/features/home/components/ProjectGrid.tsx)

- 项目卡片和新建卡片增加键盘语义和 Enter/Space 行为。
- 删除工程增加确认步骤。
- 触控视口下编辑/删除快捷操作保持可见。
- hover transition 改为明确属性集合，减少布局属性参与动画。

### [globals.css](/D:/codes/ph-novella/src/styles/globals.css)

- 恢复全局 `:focus-visible` 可见焦点。
- 文本输入、textarea、select、button 和 textbox 使用同一 focus 视觉规则。
- 保留已有 `prefers-reduced-motion: reduce` 规则。

## 4. Validation Evidence

### Commands

| 命令                                                                                                                                                                                                                                     | 结果                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `pnpm exec tsc --noEmit`                                                                                                                                                                                                                 | 通过                                                                |
| `pnpm lint`                                                                                                                                                                                                                              | 通过                                                                |
| `pnpm build`                                                                                                                                                                                                                             | 通过；存在既有 Vite dynamic/static import chunk warning，不阻断构建 |
| `pnpm test -- --runInBand src/__tests__/services/remote-video-service.test.ts src/__tests__/services/configured-generation-routing.test.ts src/__tests__/services/assistant-skills.test.ts src/__tests__/services/novel.service.test.ts` | 4 suites / 56 tests 通过                                            |
| `git diff --check`                                                                                                                                                                                                                       | 通过                                                                |

### Browser acceptance

- 本地启动：`http://127.0.0.1:1420/`，Vite dev server 正常启动。
- 桌面视口：页面正常渲染，`scrollWidth === clientWidth`，无横向溢出。
- 移动视口：Playwright CLI `--mobile` 复测，`scrollWidth: 360`、`clientWidth: 360`，无横向溢出；操作按钮按内容宽度换行。
- 键盘：Tab 后 active element 的 computed `outlineStyle` 为 `solid`，`outlineWidth` 为 `2px`。
- Console：0 errors；当前页面有 1 条 warning，未形成运行时错误。
- Network：353 个静态请求已完成；未观察到 request failed。
- 截图：
  - [桌面端优化后截图](C:/Users/yaogu/.codex/visualizations/2026/09/06/01a074f6-bfdd-7340-8199-112e9e1eebd2/novella-home-desktop-after.png)
  - [移动端优化后截图](C:/Users/yaogu/.codex/visualizations/2026/09/06/01a074f6-bfdd-7340-8199-112e9e1eebd2/novella-home-mobile-after.png)

## 5. Not Yet Verified

- Tauri v2 桌面窗口、IPC、文件权限和真实资产加载。
- 有工程数据时的项目卡片键盘激活、编辑、删除和删除失败路径。
- loading/error/success/disabled 全状态的浏览器交互；本次只直接复测了首页空状态和静态工作流预览。
- `prefers-reduced-motion` 下所有 Framer Motion/局部 CSS 动画的最终状态；全局 CSS 已有 reduced-motion 规则，但仍需要逐页面检查。
- 真实供应商连接、模型请求、视频远程任务轮询、下载和成本/限流行为。
- 生产构建部署后的 CDN、远程图片可用性和 CSP。

## 6. Residual Risks and Follow-up

1. 首页视频/展台仍依赖远程 Unsplash 图片；建议后续改为项目内受控静态资产，避免断网或第三方域名策略导致视觉缺失。
2. 全局样式仍有多套 theme/token 来源和宽泛 transition；应单独安排 token consolidation，避免与业务改动同批迁移。
3. 删除确认当前使用浏览器原生 `window.confirm`，足以阻断误删，但后续可迁移到项目已有 Dialog 体系以统一桌面端体验和可测试性。
4. 本次前端修复没有改变后端/AI 架构；供应商统一封装、对话 action、资源库和长流程恢复应按综合修复路线图分阶段实施。
