<!-- ae-codex:init managed -->

# 中文与编码规则

## 统一编码

- Markdown、JSON、YAML、SQL、脚本和生成文本统一使用 UTF-8。
- 优先使用 UTF-8 无 BOM，除非目标工具明确要求 BOM。
- 写入中文内容后，应通过显式 UTF-8 读取或 Git diff 验证。

## Windows 与 PowerShell 注意事项

- PowerShell 控制台可能把合法 UTF-8 中文显示成乱码。
- 验证文件内容时可使用：

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
Get-Content -Path .\AGENTS.md -Encoding utf8 -Raw
```

- 不要只凭乱码预览判断文件损坏；先检查显式 UTF-8 输出、Git diff 或文件字节。
