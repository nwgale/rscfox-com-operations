---
name: rscfox-com-operations
description: "在 works.rscfox.com 成果管理系统中批量上传证书 PDF，利用站内 AI 识别自动回填字段。支持指导学生获奖、论文、著作、专利、著作权、个人获奖、纵向课题、横向课题等多种成果类型。包含断点续传、双层类别验证（侧边栏+弹窗下拉框）、A/B 双模式、随机过程表达输出等功能。通过 AppleScript 驱动已登录的 Chrome 浏览器执行页面操作。"
agent_created: true
---

# rscfox.com 成果上传操作技巧

在已登录 works.rscfox.com 的 Chrome 浏览器中，通过 AppleScript 的 `execute javascript` 命令自动化页面操作。无需重启浏览器——保留 cookies、localStorage 和登录态。

## 快速开始

```bash
# 1. 将 JS 写入临时文件
cat > /tmp/chrome_exec_js.js << 'JSEOF'
(function(){ return JSON.stringify({title: document.title}); })()
JSEOF

# 2. 执行
osascript scripts/exec_js.scpt
```

## 核心约束

- **仅同步** — `execute` 同步返回。不支持 async/await、Promise、fetch()。
- **字符串大小** — Base64 载荷最大约 2.6MB，经 `do shell script "cat"` 方式已确认可用。
- **无文件对话框** — 使用 DataTransfer 技术（见下文文件上传章节）。
- **AppleScript 引号** — JS 同时含单双引号时，务必先写入 `/tmp/chrome_exec_js.js` 再 `cat` 载入。

---

## 成果类别切换（关键）

### ⚠️ 关键：双层类别验证

弹窗默认类别是「论文」。若将其他类型的成果错传到论文，字段对不上，数据会错乱。必须两层保护：

**第一层：点「新增成果」前，先点左侧栏目标类别。** 用 TreeWalker（对 Vue / Element UI 稳定可靠）：

```javascript
(function(){
  var catName = '指导学生获奖'; // ⚠️ 每次上传前确认类别
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  var node;
  while (node = walker.nextNode()) {
    if (node.textContent.indexOf(catName) >= 0) {
      var el = node.parentNode;
      for (var d = 0; d < 10; d++) {
        if (!el || el === document.body) break;
        if (el.click && el.offsetParent !== null) {
          el.scrollIntoView({block: 'center'});
          el.click();
          return JSON.stringify({ok: true, text: node.textContent.trim()});
        }
        el = el.parentNode;
      }
    }
  }
  return JSON.stringify({error: 'not found'});
})()
```

**第二层：弹窗打开后，验证下拉框类别与目标一致：**

```javascript
(function(){
  var inputs = document.querySelectorAll('input[placeholder]');
  for (var i = 0; i < inputs.length; i++) {
    var p = inputs[i].placeholder || '';
    if (p.indexOf('成果') >= 0 || p.indexOf('分类') >= 0 || p.indexOf('类别') >= 0) {
      return JSON.stringify({categoryField: p, value: inputs[i].value || '(empty)'});
    }
  }
  return JSON.stringify({warning: 'no category field found in dialog'});
})()
```

点击侧边栏后等待约 1.5s，再继续。

---

## 批量上传流程（A/B 双模式）

适用场景：批量上传文件并利用站内 AI 识别自动回填字段。基于目录和 `.upload-progress.json` 进度文件运行。

### 进度文件格式

在源目录下放置 `.upload-progress.json`：

```json
[
  {"index": 1, "file": "xxx.pdf", "size": 12345, "status": "pending", "time": null, "result": null},
  {"index": 2, "file": "yyy.pdf", "size": 23456, "status": "done",    "time": "2026-06-24T...", "result": {...}},
  {"index": 3, "file": "zzz.pdf", "size": 34567, "status": "failed",  "time": "2026-06-24T...", "result": {"error": "AI识别后前3个字段均为空"}}
]
```

状态：`pending`（未处理）、`done`（已完成）、`failed`（B+A 均失败）。

### 模式选择

| 文件序号 | 模式 | 说明 |
|---------|------|------|
| 1–2 | **A**（完整检查） | 验证环境稳定：上传 → 读空字段 → AI → 读已填字段 → 保存 |
| 3+ | **B**（轻量批处理） | 跳过中间读数，只在 AI 后验证一次前 3 字段 |

### A 模式（每文件）

```
0. 点击左侧栏目标类别（第一层）
1. 点击「新增成果」
1a. 验证弹窗下拉框类别正确（第二层）——不匹配则中止
2. 通过 DataTransfer 上传 PDF
3. 等待 15s
4. 读 placeholder 字段 → 确认全部为空
5. 点击「AI识别」
6. 等待 25s
7. 读 placeholder 字段 → 前 3 个至少有一个非空
8. 点击「完成」保存
9. 更新进度：status → "done"
```

### B 模式（每文件）

```
0. 点击左侧栏目标类别（第一层）
1. 点击「新增成果」
1a. 验证弹窗下拉框类别正确（第二层）——不匹配则中止
2. 通过 DataTransfer 上传 PDF
3. 等待 15s
4. 点击「AI识别」
5. 等待 25s
6. 检查 AI：读前 3 个 placeholder 字段 → 若全部为空 → AI 失败
7. 如成功：点击「完成」保存
8. 等待 2s
9. 更新进度：status → "done" 或 "failed"
```

### B 模式失败回退

若 B 模式检测到 AI 失败（保存后前 3 个 placeholder 字段全空）：

1. 标记文件为 `failed`（不阻断批量）
2. 可选：对该文件用 **A 模式**重跑一次以获取诊断信息
3. 其余文件继续用 B 模式
4. 批量结束后汇报所有 `failed` 条目

### AI 成功判定（通用，适用任何表单）

AI 识别后，按 DOM 顺序读取 `input[placeholder]` 和 `textarea[placeholder]`：

```
若 field[0] 非空 → AI 成功
若 field[1] 非空 → AI 成功
若 field[2] 非空 → AI 成功
否则 → AI 失败（三个全空）
```

表单无关——无论表单有 5、7 还是 10 个字段均适用，不硬编码字段名。

**读取 JS：**

```javascript
(function(){
  var inps = document.querySelectorAll('input[placeholder], textarea[placeholder]');
  var fields = [];
  for (var i = 0; i < inps.length; i++) {
    var p = inps[i].placeholder || '';
    var v = inps[i].value || '';
    if (p) fields.push({placeholder: p, value: v, index: i});
  }
  var ok = fields.length > 0 && (fields[0].value || (fields[1] && fields[1].value) || (fields[2] && fields[2].value));
  return JSON.stringify({ok: ok, fields: fields});
})()
```

---

## 页面操作速查

### 点击「AI识别」

```javascript
(function(){
  var btn = document.querySelector('button.paper-editor__recognize');
  if(!btn) return JSON.stringify({error:'no ai button'});
  btn.click();
  return JSON.stringify({clicked:true});
})()
```

### 点击「完成」保存

```javascript
(function(){
  var btns = document.querySelectorAll('button');
  for(var i=0;i<btns.length;i++){
    if(btns[i].innerText.trim()==='完成'){
      btns[i].click();
      return JSON.stringify({clicked:'完成'});
    }
  }
  return JSON.stringify({error:'not found'});
})()
```

### 检查弹窗状态

```javascript
(function(){
  var ov = document.querySelector('.el-overlay.el-modal-dialog');
  if(ov && window.getComputedStyle(ov).display!=='none')
    return JSON.stringify({dialog:'open'});
  return JSON.stringify({dialog:'closed'});
})()
```

### 按 placeholder 读表单字段

```javascript
(function(){
  var r = {};
  var inps = document.querySelectorAll('input[placeholder], textarea[placeholder]');
  for(var i=0;i<inps.length;i++){
    var p = inps[i].placeholder||'';
    var v = inps[i].value||'';
    if(p) r[p]=v;
  }
  return JSON.stringify(r);
})()
```

---

## 文件上传（DataTransfer）

```bash
node scripts/generate_upload_js.js /path/to/file.pdf [input-selector]
osascript scripts/exec_js.scpt
```

读取文件、base64 编码、生成 JS 创建 Blob → File → DataTransfer，在文件 input 上触发 `change` 事件。默认选择器：`.paper-editor__file-input`。

---

## 多标签页定位

当站点打开新标签页/弹窗时，标准 `exec_js.scpt` 只操作最前标签页。用以下模式按 URL 片段查找并执行 JS：

```bash
cat > /tmp/chrome_target_tab.scpt << 'SCRIPT'
set jsScript to do shell script "cat /tmp/chrome_exec_js.js"

tell application "Google Chrome"
	repeat with w in windows
		repeat with t in tabs of w
			if URL of t contains "TARGET_URL_FRAGMENT" then
				set jsResult to execute t javascript jsScript
				return jsResult
			end if
		end repeat
	end repeat
	return "Tab not found"
end tell
SCRIPT

osascript /tmp/chrome_target_tab.scpt
```

**关键规则**：不要在 repeat 循环内设置 `active tab index` 或 `index of w`——AppleScript 会报 "-10006" 错误。直接在找到的 tab 引用上 `execute t javascript`。

---

## 使用话术 / 可复用提示词模板

将以下模板发给同事，替换 `{目录路径}` 和 `{成果类别}` 后直接粘贴到 WorkBuddy。同事需先安装 `rscfox-com-operations` skill，并在 Chrome 中登录 `works.rscfox.com`。

### 模板

```
使用 rscfox-com-operations skill，批量上传证书到 works.rscfox.com。

- 证书目录: {目录路径}
- 成果类别: {成果类别}
  （可选值：指导学生获奖、论文、著作、专利、著作权、个人获奖、纵向课题、横向课题 等）

要求：
1. 生成进度文件 .upload-progress.json
2. 每文件：左侧栏切类别 → 新增成果 → 上传PDF → AI识别 → 检查字段 → 完成
3. 上传前验证弹窗顶部下拉框类别是否正确
4. 输出：仅开始/结束两条，随机 30% 插入过程表达
5. 页面刷新或切标签页后自动恢复（多标签页定位）
6. 失败自动重试一次 AI 识别，仍失败则跳过继续

如果目录下已有 .upload-progress.json，从第一个 pending 继续（断点续传）。
```

### 示例

```
使用 rscfox-com-operations skill，批量上传证书到 works.rscfox.com。

- 证书目录: /Users/zhangsan/Downloads/指导学生获奖证书/
- 成果类别: 指导学生获奖
```

### 同事准备工作

1. 安装 skill：把整个 `rscfox-com-operations` 文件夹放入 `~/.workbuddy/skills/`
2. Chrome 打开 `https://works.rscfox.com/achievements` 并登录
3. 证书 PDF 放在一个目录里（目录名随意）
4. 粘贴话术到 WorkBuddy，开始上传
5. 查看进度：终端运行 `tail -f /tmp/batch_upload_fast.log`

---

## 时序参考

- 上传文件后：等待 **15 秒**再点 AI 识别
- 点击 AI 识别后：等待 **25 秒**再检查结果
- 点击「完成」保存后：等待 **2 秒**再进行下一步
- B 模式每文件总耗时：约 45 秒（15 + 25 + 2 + 开销）

## AppleScript 引号处理——务必用文件方式

内联 JS 含混合引号时 AppleScript 会报 `missing value`。务必：

1. 将 JS 写入 `/tmp/chrome_exec_js.js`
2. 通过 `set jsScript to do shell script "cat /tmp/chrome_exec_js.js"` 执行
3. `execute active tab of front window javascript jsScript`

`cat` 方式也能处理 2.6MB+ 的 JS 文件（内联会触及 AppleScript 字符串上限）。

## 限制

- **不支持异步** — `execute` 命令中不能直接用 fetch()、Promise 或 async/await
- **不能操作文件对话框** — 无法与 macOS 原生文件对话框交互（除非 System Events 有辅助功能权限）
- **不能跨域 iframe** — 无法在跨域 iframe 中执行 JS

## 参考

详见 `references/applescript_ref.md`，包含完整的 AppleScript API、常用 JS 模式及已知限制。
