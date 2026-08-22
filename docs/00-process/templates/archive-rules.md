<!-- ae-codex:init managed -->

# 文档归档规则

## 归档触发条件

- 执行中的过程记录状态为 `done`。
- 相关验证已经执行，或剩余风险已明确记录。
- 如产生长期知识，已对照 `docs/08-ai-memory/00-index.md` 完成最小必要更新。

## 归档目录

- 过程归档：`docs/00-process/archive/YYYY-MM/<task-name>/`
- 专题归档：`docs/99-archive/YYYY-MM/<topic-or-ticket>/`
- AE 兼容归档：如涉及 AE 产物，`docs/ae/archive/` 可保留指向过程归档的说明。

## 归档内容

- 执行中的过程记录或计划文件。
- 关联分析、设计、API、SQL、报告、测试数据和验证记录。
- 必要时记录关键命令、SQL 和用户回传输出的摘要。

## 证据保留

- `docs/ae/gates/` 与 `docs/ae/evidence/artifacts/` 下的证据保留 3 个月；超期后在月度整理时移入 `docs/ae/archive/<原子目录>/YYYY-MM/`，移动前确认 ledger 或审查记录中的引用已同步更新。
- `review-package` 产物只保留指纹（提交列表、diffstat、评审清单、base/head 与重建命令），不保存全量 diff 正文；需要原始 diff 时用产物中的重建命令从 Git 历史生成。
- 历史遗留的全量 `.diff` 产物在确认无引用后可直接删除。

## 归档后动作

- 移动前在过程记录中写明归档路径，或按项目需要保留简短索引。
- 只把稳定、可复用、长期有效的结论写入 `docs/08-ai-memory`，不要把原始过程日志写入记忆库。
