# Vite 对话代理与桌面原生传输

## 2026-08-22

- 已捕获浏览器证据：远端对话服务的 CORS 预检在实际 SSE `POST` 前失败；浏览器错误被 UI 映射为可操作提示。
- 开发代理范围：Vite `serve` 模式、固定同源前缀、启动进程指定的 HTTPS origin；客户端仅转发原 endpoint 的 path/query，不能指定代理目标。
- 发布边界：Vite 不参与打包，代理开关在 `build` 模式强制关闭；生产根治为后续 Tauri/Rust HTTP/SSE transport，不在本次实现。
- 验证：聚焦 Jest 4/4、TypeScript、Vite build 通过；无认证代理路由 smoke 得到远端 HTTP 404，证明转发发生但不证明受认证 SSE 成功。
- 后续改造：已新增 native transport PRD/design/plan，并接入 Rust command、Tauri bridge、Tauri runtime 选择和助手恢复控件；前端聚焦测试 12/12 通过，Rust 检查因本机没有 `cargo` 未执行。
- 生产构建复核：`dist` 中未发现 `__novella_dialogue_proxy` 或 `NOVELLA_VITE_DIALOGUE_PROXY_ENABLED` 标记，代理服务不会随发布 bundle 生效。
