# Chrome AppleScript Interface Reference

## Core Pattern: Execute JavaScript in a Dedicated Chrome Window

This skill never uses `front window` or iterates all windows by URL. Instead, it creates a dedicated automation window and targets it by window ID:

```applescript
tell application "Google Chrome"
	try
		set wId to (do shell script "cat /tmp/chrome_auto_win_id.txt 2>/dev/null") as integer
		set w to window id wId
	on error
		return "ERROR: Automation window not found. Run init first."
	end try
	execute active tab of w javascript "<js-code>"
end tell
```

Create/reset the dedicated window with:

```bash
osascript scripts/chrome_auto_init.scpt [optionalURL]
```

**Why dedicated window?** Chrome shares cookies across windows of the same profile, so the new window inherits login state. At the same time, the automation never steals focus or interferes with the user's other Chrome windows.

**Important constraints:**

1. **Sync only** — The `execute` command returns synchronously. Async functions (async/await, Promises) return empty/missing value. Use only synchronous JavaScript.

2. **String escaping** — Single quotes inside JS must be escaped in AppleScript strings. For complex JS, write to a file and load via `do shell script "cat"`:

```applescript
set jsScript to do shell script "cat /tmp/chrome_exec_js.js"

tell application "Google Chrome"
	try
		set wId to (do shell script "cat /tmp/chrome_auto_win_id.txt 2>/dev/null") as integer
		set w to window id wId
	on error
		return "ERROR: Automation window not found. Run init first."
	end try
	execute active tab of w javascript jsScript
end tell
```

3. **Return value** — The return value of the JavaScript expression is returned by `execute`. Use `JSON.stringify()` to return structured data.

4. **Large data** — Base64 strings up to ~2.6MB confirmed working via `do shell script "cat /tmp/file"` approach. The 650KB limit was overly conservative; 2.6MB JS files execute fine with a 60s timeout.

## Page Navigation

All navigation happens inside the dedicated automation window (`w`):

```applescript
-- Get current URL
tell application "Google Chrome" to get URL of active tab of w

-- Navigate to URL
tell application "Google Chrome" to set URL of active tab of w to "https://works.rscfox.com/achievements"

-- Get page title
tell application "Google Chrome" to get title of active tab of w

-- Reload page
tell application "Google Chrome" to tell active tab of w to reload
```

## Common JS Patterns

### Click an element
```javascript
document.querySelector('<selector>').click();
```

### Wait for element (synchronous polling)
```javascript
(function(){
  var end = Date.now() + 5000;
  while(Date.now() < end){
    var el = document.querySelector('<selector>');
    if(el && el.offsetWidth > 0) break;
  }
})()
```

### Read all visible form inputs
```javascript
(function(){
  var inputs = document.querySelectorAll('input, textarea, .el-input__inner');
  var fields = {};
  for(var i=0;i<inputs.length;i++){
    var inp = inputs[i];
    var val = inp.value || '';
    if(val){
      var formItem = inp.closest('.el-form-item');
      var label = formItem ? formItem.querySelector('.el-form-item__label') : null;
      fields[label ? label.textContent.trim() : 'field_'+i] = val;
    }
  }
  return JSON.stringify(fields);
})()
```

### Read Element UI / Vue select values
```javascript
(function(){
  var selects = document.querySelectorAll('.el-select');
  var results = [];
  for(var i=0;i<selects.length;i++){
    var placeholder = selects[i].querySelector('.el-select__placeholder');
    var selected = selects[i].querySelector('.el-select__selected-item, .el-tag');
    results.push({
      placeholder: placeholder ? placeholder.textContent.trim() : null,
      selected: selected ? selected.textContent.trim() : null
    });
  }
  return JSON.stringify(results);
})()
```

### Check if dialog is open
```javascript
(function(){
  var dlg = document.querySelector('<dialog-selector>');
  if(!dlg) return JSON.stringify({error:'no dialog'});
  return JSON.stringify({
    visible: dlg.offsetWidth > 0,
    display: window.getComputedStyle(dlg).display
  });
})()
```

## File Upload via DataTransfer

When the System Events keystroke approach is not available (accessibility permissions not granted), use the DataTransfer technique:

1. Read file as base64 using Node.js
2. Generate JS that decodes base64 → Blob → File → DataTransfer
3. Execute the JS in Chrome

See `scripts/generate_upload_js.js` for the generator script.

**Important:** The page must have an `<input type="file">` element. The DataTransfer approach bypasses the file dialog by programmatically setting the file input's `.files` property and dispatching a `change` event.

## Batch Workflow Tips

### Timing

- After file upload: wait **15 seconds** before clicking AI recognition
- After AI recognition click: wait **25 seconds** before checking results
- After clicking "完成" (save): wait **2 seconds** before next action
- Total per file in B mode: ~45 seconds (15 + 25 + 2 + overhead)

### AppleScript quoting — always use file-based approach

Inline JS with mixed quotes causes `missing value` errors in AppleScript. Always:

1. Write JS to `/tmp/chrome_exec_js.js`
2. Execute via: `set jsScript to do shell script "cat /tmp/chrome_exec_js.js"`
3. `execute active tab of w javascript jsScript` (where `w` is the dedicated window loaded from `/tmp/chrome_auto_win_id.txt`)

The `cat` approach also handles 2.6MB+ JS files (inline would hit AppleScript string limits).

### File naming with special characters

PDF filenames often contain Chinese quotes (""), English quotes, parentheses. The `generate_upload_js.js` script handles these by escaping. When passing filenames inline in JS strings, use the same escaping pattern.

## Limitations

- **No async support** — Cannot use fetch(), Promises, or async/await directly in the `execute` command
- **No file dialog automation** — Cannot interact with native macOS file dialogs unless System Events has accessibility permissions
- **No iframe access** — Cannot execute JS in cross-origin iframes
- **Mixed content** — HTTPS pages cannot fetch from HTTP localhost; use an HTTPS local server if needed
