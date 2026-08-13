---
name: rscfox-com-operations
description: "在 works.rscfox.com 成果管理系统中自动化操作。包含 4 个分能力：(1) 上传证书 PDF（单条/批量模式），利用站内 AI 识别自动回填字段；(2) 成果列表批量操作（导出 Excel / 导出附件 PDF / 批量修改 / 删除成果）；(3) 筛选器（PKU 北核等单项勾选 + 时间预设过去五年等）；(4) 任务中心下载（导出任务完成后手动点下载）。支持指导学生获奖、论文、著作、专利、著作权、个人获奖、纵向课题、横向课题等多种成果类型。包含断点续传、双层类别验证（侧边栏+弹窗下拉框）、单条上传模式（带每步硬校验）、专用 Chrome 窗口隔离等功能。通过 AppleScript 驱动已登录的 Chrome 浏览器在独立窗口中执行页面操作，不影响用户正在使用的其它 Chrome 窗口。所有 JS 已固化为 scripts/stepN_*.js、scripts/export_stepN_*.js、scripts/filter_stepN_*.js、scripts/task_center_*.js 文件，调用时直接 cp 即可。"
agent_created: true
---

# rscfox.com 成果上传操作技巧

在已登录 works.rscfox.com 的 Chrome 浏览器中，通过 AppleScript 的 `execute javascript` 命令在**独立的 Chrome 窗口**中自动化页面操作。无需重启浏览器——新窗口保留 cookies、localStorage 和登录态，且绝不会抢占或操作用户正在使用的其它 Chrome 窗口。

## 快速开始

```bash
# 1. 创建专用自动化窗口（首次或需要重置窗口时执行）
osascript scripts/chrome_auto_init.scpt

# 2. 将 JS 写入临时文件
cat > /tmp/chrome_exec_js.js << 'JSEOF'
(function(){ return JSON.stringify({title: document.title}); })()
JSEOF

# 3. 在专用窗口中执行（不影响你正在用的其它 Chrome 窗口）
osascript scripts/exec_js.scpt
```

## 核心约束

- **仅同步** — `execute` 同步返回。不支持 async/await、Promise、fetch()。
- **字符串大小** — Base64 载荷最大约 2.6MB，经 `do shell script "cat"` 方式已确认可用。
- **无文件对话框** — 使用 DataTransfer 技术（见下文文件上传章节）。
- **AppleScript 引号** — JS 同时含单双引号时，务必先写入 `/tmp/chrome_exec_js.js` 再 `cat` 载入。

---

## 单条上传模式（推荐，含每步硬校验）

适用于**逐个上传**单个文件并利用站内 AI 识别自动回填字段。**每一步都附带一项硬校验**，校验失败必须停下来，不继续往下做。

### 调用前置条件

调用时必须已知：
- **文件路径**（绝对路径）
- **成果类型**（如「论文」「个人获奖」「指导学生获奖」等）

### 流程总览

| 步骤 | 动作 | 校验目标 |
|---|---|---|
| 0 | 准备工作 | 调用时已确定文件路径和成果类型 |
| 1 | 切换类别 | 侧边栏激活类别 == 期望类型 |
| 2 | 打开「新增成果」弹窗 | 弹窗可见 + 标题正确 + 弹窗内类别 == 期望类型 |
| 3 | 上传文件 | 文件卡片数 >= 1 + 顶部 tab「全部页 N」== 卡片数 |
| 4 | 点「AI 识别」 | 按钮退出 loading + 前 3 个 placeholder 字段至少 1 个非空 |
| 5a | 读基线 | 侧边栏对应类别计数 = N1 |
| 5 | 点「完成」保存 | 弹窗消失 + 侧边栏计数 N2 == N1 + 1 |

每一步都有「动作」和「校验」两类 JS，**全部已固化为 scripts/ 下的独立文件**，调用时直接 `osascript exec_js.scpt` 即可。

| 步骤 | 动作脚本 | 校验脚本 |
|---|---|---|
| 0 | （无） | （无） |
| 1 | （手动点击） | `step1_verify.js` |
| 2 | `step2_click.js` | `step2_verify.js` |
| 3 | `generate_upload_js.js` + `exec_js.scpt` | `step3_verify.js` |
| 4 | `step4_click.js` | `step4_verify.js`（轮询） |
| 5a | （读基线） | `step5_baseline.js`（点「完成」之前） |
| 5 | `step5_click.js` | `step5_verify.js` |

每一步的「调用方式」与「判定标准」如下。

#### Step 0 — 准备工作
- 调用时已确定文件路径和成果类型
- 示例：
  - 路径：`/Users/.../二维动画设计课程..._曾莹.pdf`
  - 类型：论文

#### Step 1 — 切换类别

**手动或脚本点击侧边栏目标类别。** 类别的 className 是 `workspace-side-item`。

**调用：**
```bash
cp scripts/step1_verify.js /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
```

**判定**：返回的 `activeCategory` 字段 == 期望类型字符串。

#### Step 2 — 打开「新增成果」弹窗

**动作（点击）：**
```bash
cp scripts/step2_click.js /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
```

**校验：**
```bash
cp scripts/step2_verify.js /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
```

**判定**（三个字段同时满足才进入 Step 3）：
- `hasVisibleEditor === true`
- `editorTitle === "新增成果"`
- `dialogCategory === 期望类型`

**任意一项不满足立即中止，不进入 Step 3**。

#### Step 3 — 上传文件

**动作（DataTransfer 注入 + 立即执行）：**
```bash
node scripts/generate_upload_js.js /path/to/file.pdf && \
  osascript scripts/exec_js.scpt
```

**校验（等待 2–3 秒后执行）：**
```bash
cp scripts/step3_verify.js /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
```

**注意**：
- element-ui 的 `el-upload` 接收文件后会**主动清空** `input[type=file].files`，所以不能用 `files.length` 判断上传成功。
- 该站使用的**真实**文件列表 className 是 `.paper-editor__attachment-card`（不是默认的 `.el-upload-list__item`）。
- 每个 PDF 文件可能拆成多个 page-card（多页 PDF 就有多张卡片）。

**判定**：
- `attachmentCardCount >= 1`
- `pageFilterText` 中「全部页 N」的 N == `attachmentCardCount`

双重确认。**`pageFilterText` 中的数字必须等于 `attachmentCardCount`，否则中止**。

#### Step 4 — 点「AI 识别」

**动作（点击）：**
```bash
cp scripts/step4_click.js /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
```

**校验（轮询直到 AI 完成，最多 60 秒）：**
```bash
cp scripts/step4_verify.js /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
# 间隔 3 秒后再次执行，直到通过为止
```

**判定**：
- `buttonState.disabled === false` 且 `buttonState.className` 不含 `is-disabled` / `is-loading`
- `top3Fields` 中至少 1 个 `val` 非空

**轮询策略**：
- 间隔 3 秒
- 最长等待 60 秒（超时视为 AI 失败）
- 任一时刻按钮未 disabled → 继续等
- 按钮 disabled 已退出 + 字段满足 → 继续 Step 5
- 超时 → 报告「AI 识别超时」并停止

#### Step 5a — 读基线（在点「完成」之前）

**目的**：保存侧边栏对应类别的当前计数 N1，作为「+1」的对照基准。

**调用：**
```bash
sed "s|{CATEGORY_LABEL}|论文|g" scripts/step5_baseline.js > /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
```

**判定**：
- 返回 `categoryCount` 字段，记录为 N1
- 如果 N1 == null（找不到该类别），说明 sidebar 状态异常，**中止**

#### Step 5 — 点「完成」保存

**动作（点击）：**
```bash
cp scripts/step5_click.js /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
```

**校验（等待 2 秒后执行）：**
```bash
sed "s|{CATEGORY_LABEL}|论文|g" scripts/step5_verify.js > /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
```

**判定**（**双指标**同时满足）：
- `hasVisibleEditor === false`（弹窗消失）
- `categoryCount` 字段（N2）== N1 + 1

**若 N2 != N1 + 1**：
- N2 > N1 + 1 → 可能保存时同时插入了多条，**异常**
- N2 == N1 → 「完成」点击没生效（弹窗虽然消失但提交失败），**异常**
- N2 < N1 → 异常，绝对不可能

**注意**：`{CATEGORY_LABEL}` 必须替换为**用户上传的类别**（如「论文」/「个人获奖」/「指导学生获奖」），用于读侧边栏对应类别的计数。

---

## 批量上传模式（新）

> **A/B 模式及任何旧的批量模式已全部废弃**。批量上传 = 单条上传模式循环 N 次，**外加 1 次重试 + 1 次浏览器刷新**。

### 适用场景

用户给定一个目录，里面有 N 个 PDF/图片（论文/证书/专利等），需要把全部文件上传到 works.rscfox.com 的同一类别下。

### 阶段 1：准备浏览器（一次性）

执行专用 Chrome 窗口初始化（**避免和用户抢窗口**）：

```bash
osascript scripts/chrome_auto_init.scpt https://works.rscfox.com/achievements
```

- 创建一个独立 Chrome 窗口
- 记录 window id 到 `/tmp/chrome_auto_win_id.txt`
- 用户可以继续正常使用其他 Chrome 窗口，互不干扰

### 阶段 2：扫描目录 + 生成进度（一次性）

1. 扫描用户指定的目录，列出所有 `*.pdf`、`*.png`、`*.jpg`、`*.jpeg` 文件
2. 按**文件名升序**排序（保证可预测的顺序）
3. **在用户指定的目录内**生成 `.upload-progress.json`（不是上级目录）：

```json
[
  {"index": 1, "file": "xxx.pdf", "size": 12345, "status": "pending", "time": null, "result": null, "retryCount": 0},
  {"index": 2, "file": "yyy.pdf", "size": 23456, "status": "done",    "time": "2026-06-24T...", "result": {...}, "retryCount": 0},
  {"index": 3, "file": "zzz.pdf", "size": 34567, "status": "failed",  "time": "2026-06-24T...", "result": {"error": "AI识别超时"}, "retryCount": 1}
]
```

字段说明：
- `status`：`pending`（未处理）/ `done`（成功）/ `failed`（失败，已重试 1 次）
- `retryCount`：本文件已重试次数（0 或 1）

**断点续传**：如果 `.upload-progress.json` 已存在，跳过 `done` 和 `failed` 状态，只处理 `pending` 的文件。

### 阶段 3：循环处理（每个文件）

**对每个 `pending` 状态的文件，按「单条上传模式」跑一遍**：

```
Step 1   → 校验侧边栏激活类别；如果不是目标类别则点击切换
Step 2   → 点击「+ 新增成果」+ 校验弹窗
Step 3   → 上传文件 + 校验 attachment-card
Step 4   → 点击「AI 识别」+ 轮询校验
Step 5a  → 读基线 N1
Step 5   → 点「完成」+ 校验 N2 == N1 + 1
```

**失败处理（重要）：**

如果**任一硬校验失败**，**不要停止整个批量**。执行以下重试流程：

```
A. 刷新浏览器到 https://works.rscfox.com/achievements
B. 重新执行完整的 Step 1 → 5a → 5
C. 如果重试通过：
   - 进度标 done
   - 继续下一个文件
D. 如果重试仍失败：
   - 进度标 failed（retryCount = 1）
   - 跳过该文件，继续下一个文件
```

**重试只一次**，不无限循环。

**为什么先刷新浏览器？** 因为弹窗残留、Vue 状态错乱、网络瞬断等，都可以通过页面重载自愈。

### 阶段 4：汇报

批量跑完后，输出：

```
批量上传完成。
- 总数: 20
- done: 18
- failed: 2
- failed 文件列表:
  - file_03.pdf (AI 识别超时)
  - file_15.pdf (Step 5 N2 != N1 + 1)
```

---


## 分能力 2：成果列表批量操作（导出 / 批量修改 / 删除）

> 适用于「对已存在的成果做批量处理」。前置条件：先在「分能力 1」上传到列表，或在「分能力 3」筛选后再处理。

### 适用场景

| 能力 | 用途 | 二次确认 |
|---|---|---|
| 导出 Excel | 导出所选行的字段表格（论文名/刊物名/作者等） | 「确认导出」 |
| 导出附件 PDF | 打包下载所选行的 PDF 附件 | 「确认导出」 |
| 批量修改 | 一次修改所选行的多个字段 | 「确认修改」 |
| 删除成果 | 删除所选行 | 「确认删除」 |

### 通用入口：勾选 → 底部操作面板 → 触发按钮

底部「**已选择 N 项成果**」操作面板**只在「简表」模式下出现**。引文模式没有这个面板。

### 通用步骤（4 步）

```
Step 1   — 切到「简表」模式（如果还在引文模式）
Step 2   — 勾选目标行（全选 or 前 N 行）
Step 3   — 点击底部「导出 Excel / 导出附件 PDF / 批量修改 / 删除成果」之一
Step 4   — 处理二次确认弹窗（确认导出 / 确认修改 / 确认删除）
Step 5   — 等待下载（仅 Excel/PDF 导出）—— 通过 find ~/Downloads -newer /tmp/MAKEREF 找新文件
```

### 各步固化脚本

| 步 | 文件 | 调用 | 期望返回 |
|---|---|---|---|
| 1 | `export_step1_simple_table.js` | `cp ... && osascript ...` | `active: "简表"` |
| 2a | `export_step2_select_all.js` | `cp ... && osascript ...` | `newlyChecked: N >= 1` |
| 2b | `export_step2_select_n.js` | `sed "s\|{N}\|5\|g" ... && osascript ...` | `newlyChecked: N` |
| 2c | `export_step2_unselect.js` | `cp ... && osascript ...` | 全部取消 |
| 3 | `export_step3_action.js` | `sed "s\|{ACTION}\|导出 Excel\|g" ... && osascript ...` | `clicked: true` |
| 4 | `export_step4_confirm.js` | `sed "s\|{CONFIRM_TEXT}\|确认导出\|g" ... && osascript ...` | `clicked: true` |
| 5 | `export_step5_wait_download.js` | 配合 `find ~/Downloads -newer ...` | （用户本机）文件路径 |

**`{ACTION}` 可取值**：`导出 Excel` / `导出附件 PDF` / `批量修改` / `删除成果`

**`{CONFIRM_TEXT}` 可取值**：
- 对应导出 Excel / 导出附件 PDF / 批量修改 → `确认导出`
- 对应删除成果 → `确认删除`

### 完整调用样例：导出北核论文为 Excel

```bash
# 假设已经按分能力 3 筛选出 6 条北核
# 阶段 A：切到简表
cp scripts/export_step1_simple_table.js /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt

# 阶段 B：勾选所有 6 行
cp scripts/export_step2_select_all.js /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt

# 阶段 C：点「导出 Excel」
sed "s|{ACTION}|导出 Excel|g" scripts/export_step3_action.js > /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt

# 阶段 D：点「确认导出」
sed "s|{CONFIRM_TEXT}|确认导出|g" scripts/export_step4_confirm.js > /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt

# 阶段 E：等待下载，标记开始时间
touch /tmp/MAKEREF
sleep 8
find ~/Downloads -name "*.xlsx" -newer /tmp/MAKEREF
```

### 完整调用样例：删除若干条记录

```bash
# 勾选要删除的行
cp scripts/export_step2_select_n.js /tmp/chrome_exec_js.js
sed -i '' "s|{N}|3|g" /tmp/chrome_exec_js.js    # macOS sed
osascript scripts/exec_js.scpt

# 点「删除成果」
sed "s|{ACTION}|删除成果|g" scripts/export_step3_action.js > /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt

# 点「确认删除」
sed "s|{CONFIRM_TEXT}|确认删除|g" scripts/export_step4_confirm.js > /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
```

### 关键陷阱

1. **「简表」模式必填**：如果当前是「引文」模式，操作面板不出现，按钮点不到。先切模式再勾选。
2. **切换模式会清空已勾选**：从「引文」切到「简表」后，之前勾选的状态会重置。**先切模式，再勾选**。
3. **`{ACTION}` 文本含空格**：sed 替换时用 `|` 而不是 `/` 作分隔符（已在脚本里这样写）。
4. **「确认导出」vs「确认删除」**：四个操作对应的确认按钮文本不同（删除时是「确认删除」），不能写死。

---

## 分能力 3：筛选器（批量操作的可选前置）

> 当 4 个批量操作能力需要「先过滤再处理」时使用。本身不独立使用，必须与分能力 2 串联。

### 适用场景

- 导出「**北核**」论文（筛选 `PKU(北大中文核心)`）
- 导出某月上传的论文（筛选「时间」）
- 删除某类别的所有记录（切到该类别 + 配合批量删除）
- 批量修改某语言/某排名的记录

### 筛选步骤

```
Step 1   — 打开顶部「更多筛选」弹窗
Step 2   — 在弹窗里勾选条件项（如「PKU(北大中文核心)」）
Step 3   — 点弹窗里的「确定」按钮
Step 4   — 切到「简表」模式（必填，否则操作面板不出现）
Verify   — 校验可见行数符合预期
```

### 各步固化脚本

#### 3a：打开更多筛选 + 勾选项

| 文件 | 调用 | 期望返回 |
|---|---|---|
| `filter_step1_open.js` | `cp ... && osascript ...` | `opened: true` |
| `filter_step2_check.js` | `sed "s\|{LABEL}\|PKU(北大中文核心)\|g" ... && osascript ...` | `checked: true` |
| `filter_more_confirm.js` | `cp ... && osascript ...` | `clicked: true` |
| `filter_step_verify.js` | `cp ... && osascript ...` | `visibleRows >= 0` |

#### 3b（可选）：时间筛选

| 文件 | 调用 | 期望返回 |
|---|---|---|
| `filter_clear.js` | `cp ... && osascript ...` | `clicked: true`（清空旧筛选） |
| `filter_time_open.js` | `cp ... && osascript ...` | `opened: true` |
| `filter_time_pick_preset.js` | `sed "s\|{PRESET_LABEL}\|过去五年\|g" ... && osascript ...` | `clicked: true` |
| `filter_time_confirm.js` | `cp ... && osascript ...` | `clicked: true` |

**重要**：「过去五年」preset **不直接生效**，必须 `pick_preset → confirm` 两步都做。

#### 3c（导出后）：任务中心下载

| 文件 | 调用 | 期望返回 |
|---|---|---|
| `task_center_download.js` | `cp ... && osascript ...` | `clicked: true` |

**重要**：导出任务完成（100%）后**不会自动下载**，必须在 `/task-center` 手动点「下载」。

### 完整调用样例：导出近5年北核论文

```bash
# 阶段 A：确保在「论文」类别
cp scripts/step1_verify.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt

# 阶段 B：清空旧筛选（防止遗留）
cp scripts/filter_clear.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt

# 阶段 C：时间筛选 = 近5年
cp scripts/filter_time_open.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
sleep 0.5
sed "s|{PRESET_LABEL}|过去五年|g" scripts/filter_time_pick_preset.js > /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
sleep 0.5
cp scripts/filter_time_confirm.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt

# 阶段 D：更多筛选 = 北核
cp scripts/filter_step1_open.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
sleep 0.5
sed "s|{LABEL}|PKU(北大中文核心)|g" scripts/filter_step2_check.js > /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
sleep 0.5
cp scripts/filter_more_confirm.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt

# 阶段 E：校验结果（应该 ~4 条北核）
cp scripts/filter_step_verify.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt

# 阶段 F：切到简表
cp scripts/filter_step4_simple_table.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
sleep 0.5

# 阶段 G：勾选所有 + 导出
cp scripts/export_step2_select_all.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
sed "s|{ACTION}|导出Excel|g" scripts/export_step3_action.js > /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
sleep 1
sed "s|{CONFIRM_TEXT}|确认导出|g" scripts/export_step4_confirm.js > /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt

# 阶段 H：等待跳转任务中心（页面会跳到 /task-center）
sleep 3

# 阶段 I：点下载按钮
cp scripts/task_center_download.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt

# 阶段 J：等下载完成
sleep 5 && find ~/Downloads -name "*.xlsx" -newer /tmp/MAKEREF
```

### 已知可筛选项（已实测）

| 标签 | 含义 |
|---|---|
| `PKU(北大中文核心)` | 北大中文核心（北核） |
| `CSCD` | 中国科学引文数据库 |
| `CSSCI` | 中文社会科学引文索引 |
| `SCI` | 科学引文索引（英文） |
| `EI` | 工程索引（英文） |
| `SCD` | 科学引文数据库（中文） |

复合值如 `CSSCIPKU` 表示同时被多个数据库收录，**筛选时只能按单项勾选**。

### 关键陷阱

1. **勾 checkbox 后必须点「确定」**：单纯勾选不会应用筛选。
2. **`{LABEL}` 文本含括号**：sed 替换时用 `|` 作分隔符（已在脚本里这样写）。
3. **筛选后必须切「简表」**：否则即使有结果，操作面板不出现。
4. **切模式会清空已勾选**：如果在「简表」下做了行勾选，再切回「引文」再切回来，勾选状态丢失。

---

## 分能力 4：任务中心下载（导出后的取文件环节）

> 当分能力 2 触发「导出 Excel / 导出附件 PDF / 批量修改」后，**网站会自动跳转到 `/task-center`**，并把任务放进任务中心。任务完成后**不会自动下载**，必须手动点。

### 适用场景

- 导出 Excel 后取 xlsx 文件
- 导出附件 PDF 后取 zip/pdf 包
- 重试/重下之前下载失败的文件

### 流程

```
Step 1   — 确认在 /task-center 路由（点击「确认导出」后会自动跳转）
Step 2   — 找第一条状态 = 已完成 的任务
Step 3   — 点该行的「下载」按钮
Step 4   — 等待浏览器自动开始下载，文件落到 ~/Downloads
```

### 固化脚本

| 文件 | 调用 | 期望返回 |
|---|---|---|
| `task_center_download.js` | `cp ... && osascript ...` | `clicked: true` |

### 完整调用样例

```bash
# 已经在 /task-center（前面点过「确认导出」会自动跳过来）
# 直接点第一条已完成任务的下载按钮
cp scripts/task_center_download.js /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt

# 等下载完成
touch /tmp/MAKEREF
sleep 5
find ~/Downloads -name "*.xlsx" -newer /tmp/MAKEREF
```

### 关键陷阱

1. **不会自动下载**：不要以为点了「确认导出」就完事了。**必须再到任务中心点下载**。
2. **任务可能排队**：大批量导出可能显示「排队中 / 处理中」，需要刷新页面等待状态变为「已完成 100%」。
3. **任务行 className 是 `.task-center-row`**（不是默认的 `.el-table__row`），任务中心的表格是自建组件。
4. **下载是浏览器默认行为**：点了下载按钮后浏览器自动开始，文件落到 `~/Downloads`，文件名是 `papers-export-YYYYMMDD-HHMMSS.xlsx`。

---

## 文件上传（DataTransfer）

### 原子性原则（务必严格遵守）

`/tmp/chrome_exec_js.js` 是 `exec_js.scpt` **唯一**读取的 JS 源文件。任何对它写操作的动作（生成器、`cp`、`cat >`）都会**覆盖**之前的全部内容。

**正确的调用模式：固化 JS 文件 + `cp` 到 `/tmp/chrome_exec_js.js`**

skill 已把每一步的 JS 固化为 `scripts/stepN_*.js` 文件。调用时**只复制文件，不修改内容**：

```bash
# ✅ 正确：直接复制固化文件，然后执行
cp scripts/step1_verify.js /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt

# ✅ 正确：上传文件用生成器，必须 && 串联
node scripts/generate_upload_js.js /path/to/file.pdf && \
  osascript scripts/exec_js.scpt

# ✅ 正确：带变量的 JS（如 step5_verify 需注入类别名），用 sed
sed "s|{CATEGORY_LABEL}|论文|g" scripts/step5_verify.js > /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt

# ❌ 错误：用 cat > 写探查 JS，会覆盖之前的上传 JS
cp scripts/step1_verify.js /tmp/chrome_exec_js.js
osascript scripts/exec_js.scpt
cat > /tmp/chrome_exec_js.js << 'EOF'        # ← 这步会覆盖！
(function(){ /* 探查 */ })()
EOF
osascript scripts/exec_js.scpt               # ← 执行的是探查，不是上传
```

### 单文件全流程模板

```bash
# Step 1
cp scripts/step1_verify.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt

# Step 2
cp scripts/step2_click.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
sleep 1
cp scripts/step2_verify.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt

# Step 3（上传 + 校验）
node scripts/generate_upload_js.js /path/to/file.pdf && osascript scripts/exec_js.scpt
sleep 3
cp scripts/step3_verify.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt

# Step 4
cp scripts/step4_click.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
# 轮询 step4_verify
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  sleep 3
  cp scripts/step4_verify.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
  # 解析结果，若 buttonState.disabled=false 且 top3Fields 至少 1 个非空 → break
done

# Step 5a — 读基线（点「完成」之前）
sed "s|{CATEGORY_LABEL}|论文|g" scripts/step5_baseline.js > /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
# 记录返回值中的 categoryCount 字段为 N1

# Step 5 — 点击完成 + 校验
cp scripts/step5_click.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
sleep 2
sed "s|{CATEGORY_LABEL}|论文|g" scripts/step5_verify.js > /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
# 记录返回值中的 categoryCount 字段为 N2
# 判定：N2 == N1 + 1 AND hasVisibleEditor == false
```

### 固化脚本清单

| 文件 | 用途 |
|---|---|
| `step1_verify.js` | 读侧边栏激活类别 |
| `step2_click.js` | 点击「+ 新增成果」按钮 |
| `step2_verify.js` | 校验弹窗打开 + 弹窗内类别 |
| `step3_verify.js` | 校验文件上传成功（attachment-card 数量） |
| `step4_click.js` | 点击「AI 识别」按钮 |
| `step4_verify.js` | 校验 AI 完成 + 字段填充 |
| `step5_baseline.js` | 读基线：保存前侧边栏类别计数 N1（带 `{CATEGORY_LABEL}` 占位符） |
| `step5_click.js` | 点击「完成」按钮 |
| `step5_verify.js` | 校验保存结果 N2 == N1 + 1（带 `{CATEGORY_LABEL}` 占位符） |

读取文件、base64 编码、生成 JS 创建 Blob → File → DataTransfer，在文件 input 上触发 `change` 事件。默认选择器：`.paper-editor__file-input`。`exec_js.scpt` 只在专用窗口中执行，不会干扰用户的其它 Chrome 窗口。

**input-selector** 是可选项。默认 `.paper-editor__file-input` 适用于所有上传场景，无需修改。

---

## 专用窗口与页面导航

`exec_js.scpt` 只操作由 `chrome_auto_init.scpt` 创建并记录的专用 Chrome 窗口（window id 写入 `/tmp/chrome_auto_win_id.txt`），不会触碰用户正在使用的其它 Chrome 窗口或标签页。

如果需要在同一窗口内切换到不同页面，直接用 JavaScript 导航即可：

```bash
cat > /tmp/chrome_exec_js.js << 'JSEOF'
(function(){
  window.location.href = 'https://works.rscfox.com/achievements';
  return JSON.stringify({navigating: true});
})()
JSEOF

osascript scripts/exec_js.scpt
```

若 `exec_js.scpt` 返回 `ERROR: Automation window not found...`，说明专用窗口未初始化，先执行：

```bash
osascript scripts/chrome_auto_init.scpt [可选URL]
```

---

## 使用话术 / 可复用提示词模板

将以下模板发给同事，替换 `{目录路径}` 和 `{成果类别}` 后直接粘贴到 WorkBuddy。同事需先安装 `rscfox-com-operations` skill，并在 Chrome 中登录 `works.rscfox.com`。

### 单条模式模板

```
使用 rscfox-com-operations skill 的「单条上传模式」上传：
- 文件: {绝对路径}
- 成果类别: {论文/个人获奖/指导学生获奖/...}

要求：
1. 严格按 Step 0–5 顺序执行，每步都要做硬校验
2. 任一步硬校验失败 → 立即停止，报告失败步骤
3. 不允许跳过任何步骤
```

### 批量模式模板

```
使用 rscfox-com-operations skill，批量上传证书到 works.rscfox.com。

- 证书目录: {目录路径}
- 成果类别: {成果类别}
  （可选值：指导学生获奖、论文、著作、专利、著作权、个人获奖、纵向课题、横向课题 等）

要求：
1. 阶段 1：执行 chrome_auto_init.scpt 创建专用 Chrome 窗口
2. 阶段 2：在「证书目录」内生成 .upload-progress.json（注意：必须在目录内，不是上级）
3. 阶段 3：对每个 pending 状态的文件，严格按单条上传模式 Step 1-5a-5 循环执行
4. 失败处理：刷新浏览器到初始地址，重试 1 次；重试仍失败 → 标 failed，跳过该文件，继续下一个
5. 阶段 4：跑完后汇报 done / failed 数 + failed 文件列表

如果目录下已有 .upload-progress.json，从第一个 pending 继续（断点续传）。
```

### 示例（批量）

```
使用 rscfox-com-operations skill，批量上传证书到 works.rscfox.com。

- 证书目录: /Users/zhangsan/Downloads/指导学生获奖证书/
- 成果类别: 指导学生获奖
```

### 同事准备工作

1. 安装 skill：把整个 `rscfox-com-operations` 文件夹放入 `~/.workbuddy/skills/`
2. Chrome 打开 `https://works.rscfox.com/achievements` 并登录（登录一次即可，新窗口会继承登录态）
3. 证书 PDF 放在一个目录里（目录名随意）
4. 粘贴话术到 WorkBuddy，开始上传
5. 上传流程会自动创建专用 Chrome 窗口，不影响同事正在使用的其它 Chrome 窗口
6. 查看进度：终端运行 `tail -f /tmp/batch_upload_fast.log`

---

## 已知陷阱（从线上失败中总结）

| 陷阱 | 错误做法 | 正确做法 |
|---|---|---|
| element-ui 文件上传后 `input.files` 被清空 | 用 `files.length === 0` 判断「未上传」 | 用 `.paper-editor__attachment-card` 数量判断 |
| 真实文件列表 className | 用 `.el-upload-list__item`（默认 element-ui className） | 用 `.paper-editor__attachment-card`（站点自定义） |
| 弹窗可见性 | 用 `.el-overlay`（8 个全 display:none 残留节点） | 用 `.el-dialog .paper-editor` 的 `getBoundingClientRect()` |
| 弹窗默认类别 | 假设与侧边栏一致 | Step 2 中独立校验 `.paper-editor__achievement-select` 文本 |
| DataTransfer 文件 input | 修改 `.files` 即可 | 必须 `dispatchEvent(new Event('change'))` 触发 element-ui onChange |
| `generate_upload_js.js` 副作用 | 在上传 JS 中间插入其他探查 JS | 生成后立即执行，中间不修改 `/tmp/chrome_exec_js.js` |

---

## AppleScript 引号处理——务必用文件方式

内联 JS 含混合引号时 AppleScript 会报 `missing value`。务必：

1. 将 JS 写入 `/tmp/chrome_exec_js.js`
2. 通过 `set jsScript to do shell script "cat /tmp/chrome_exec_js.js"` 执行
3. `execute active tab of w javascript jsScript`（`w` 为专用窗口）

`cat` 方式也能处理 2.6MB+ 的 JS 文件（内联会触及 AppleScript 字符串上限）。

## 限制

- **不支持异步** — `execute` 命令中不能直接用 fetch()、Promise 或 async/await
- **不能操作文件对话框** — 无法与 macOS 原生文件对话框交互（除非 System Events 有辅助功能权限）
- **不能跨域 iframe** — 无法在跨域 iframe 中执行 JS

## 参考

详见 `references/applescript_ref.md`，包含完整的 AppleScript API、常用 JS 模式及已知限制。
