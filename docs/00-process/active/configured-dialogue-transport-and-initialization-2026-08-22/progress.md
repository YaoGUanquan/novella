# 可配置对话服务连通性与助手初始化

- 2026-08-22：确认根因包括桌面端 CSP 自定义域名白名单缺口，以及浏览器模式可能受服务端 CORS 限制。
- 2026-08-22：完成 HTTP/传输失败分类、HTTPS 自定义 endpoint CSP 放行、空会话与新建会话自动上下文初始化。
- 验证：focused Jest 8/8、`pnpm run build:check`、Tauri JSON 解析和 `git diff --check` 均通过。
- 未验证：未使用任何用户密钥发起真实服务请求；需在当前本地页面中验证供应商 URL、模型、密钥和 CORS 策略。
