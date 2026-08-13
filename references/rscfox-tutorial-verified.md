# rscfox 浏览器操作教程（已验证 + 已修正）

> 原始文件：`/Users/appletf/claude_workspace/ikyan/06-marketing/AI教程.md`
> 本文档是已实测验证的修正版，修正了原文中的 2 个错误。

## 通用操作原则

- 操作前先确保 Chrome 当前页面处在最前台
- 每次点击前优先移动鼠标到目标控件并短暂停留
- 打开下拉面板、更多筛选面板、确认弹窗后，先等待 UI 展开完成
- 筛选、切换、分页、导出提交后，至少等待 `0.3s` 到 `0.5s` 再探查
- 如果页面出现骨架屏或加载态，先等待加载态消失
- 出现空结果不要继续导出，先报告

## 网站稳定入口（已实测）

| 业务目标 | selector / 文本 | 备注 |
|---|---|---|
| 成果管理页面 | 路由 `/achievements`；`.workspace-topbar__tab` 文本 `成果管理` | 未登录跳登录 |
| 论文类别 | `.workspace-side-item` 文本 `论文` | 高亮 |
| 清空筛选 | `.workspace-filter-clear` 文本 `清空筛选` | 防止遗留筛选 |
| 时间筛选 | `.workspace-filter-trigger` 文本 `时间` | 打开后 `.workspace-filter-popover--time` |
| 时间预设按钮 | `.workspace-filter-time-preset` 文本 `过去五年` 等 | **不直接生效**，仍需点完成 |
| 时间完成按钮 | `.workspace-filter-time-confirm` 文本 `完成` | 初始 disabled，需先选日期或预设 |
| 更多筛选 | `.workspace-filter-group--more .workspace-filter-trigger` | 打开后 `.workspace-more-filter-panel` |
| 更多筛选确定 | `.workspace-more-filter-panel__confirm` 文本 `确定` | |
| 北核选项 | `.workspace-more-filter-option` 文本 `PKU(北大中文核心)` | fuzzy match |
| 页脚结果数 | `.workspace-footer__summary` 文本 `显示 1-30 / 共 30 项` | |
| 批量操作面板 | `.paper-batch-panel` | 文案 `已选择N项成果` |
| 批量按钮容器 | `.paper-batch-panel__actions` | |
| 导出Excel按钮 | `.paper-batch-panel__action` 文本 `导出Excel` | 无空格 |
| 导出确认 | 弹窗 `确认导出` 按钮 | 确认后跳 `/task-center` |
| 任务中心 | 路由 `/task-center`；`.task-center-panel` 容器 | 任务行 `.task-center-row` |
| 任务下载按钮 | `.task-center-row` 内 `下载` 按钮 | **不会自动下载** |

## 任务：筛选近五年北核论文并导出 Excel

### 流程（共 8 步）

1. 打开 `/achievements` + 切到「论文」类别
2. 清空旧筛选（`.workspace-filter-clear`）
3. 打开「时间」+ 选「过去五年」+ **点「完成」** ⚠️ 必须点完成
4. 打开「更多筛选」+ 勾选「PKU(北大中文核心)」+ 点「确定」
5. 切到「简表」模式
6. 勾选所有行
7. 点「导出Excel」+ 点「确认导出」→ 跳任务中心
8. 在任务中心点「下载」

### ⚠️ 教程修正点（与原文不同）

**修正 1：「过去五年」必须点完成**
- 原文：「选择 `过去五年` 快捷项时不要点 `完成`」
- 实测：「过去五年」点击只设 `is-active` 视觉状态，**列表不会刷新**。必须点 `完成` 按钮才会提交筛选。
- 推断原因：「过去五年」预填了日期范围到 form state，但需要 `完成` 按钮触发提交。

**修正 2：任务不会自动下载**
- 原文：「如果没有立刻下载，等待任务完成」
- 实测：任务**已经是 100% 已完成**状态，但浏览器**不会自动开始下载**。必须在任务中心手动点「下载」按钮。

### 各步固化脚本（已验证）

| 步 | 文件 | 操作 |
|---|---|---|
| 1 | `step1_verify.js` | 校验激活类别 = 论文 |
| 2 | `filter_clear.js` | 点 `.workspace-filter-clear` |
| 3a | `filter_time_open.js` | 点 `.workspace-filter-trigger` 文本「时间」 |
| 3b | `filter_time_pick_preset.js` | 点 `.workspace-filter-time-preset` 文本「过去五年」 |
| 3c | `filter_time_confirm.js` | 点 `.workspace-filter-time-confirm` |
| 4a | `filter_step1_open.js` | 点更多筛选 |
| 4b | `filter_step2_check.js` | 勾选 PKU(北大中文核心) |
| 4c | `filter_more_confirm.js` | 点 `.workspace-more-filter-panel__confirm` |
| 5 | `filter_step4_simple_table.js` | 切到简表 |
| 6 | `export_step2_select_all.js` | 勾选所有行 |
| 7a | `export_step3_action.js` | 点导出Excel（`{ACTION}=导出Excel`） |
| 7b | `export_step4_confirm.js` | 点确认导出（`{CONFIRM_TEXT}=确认导出`） |
| 8 | `task_center_download.js` | 在 `/task-center` 找第一条已完成任务，点「下载」 |
