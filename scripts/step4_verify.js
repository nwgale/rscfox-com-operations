// Step 4 verify: 校验 AI 识别是否完成 + 字段是否被填充
// 调用：osascript scripts/exec_js.scpt（轮询）
// 期望：buttonState.disabled=false && className 不含 is-disabled/is-loading
//       && top3Fields 至少 1 个 val 非空
JSON.stringify({
  buttonState: (function(){
    var btn = document.querySelector(".el-dialog .paper-editor .paper-editor__recognize");
    if (!btn) return null;
    return {disabled: btn.disabled, className: btn.className};
  })(),
  top3Fields: (function(){
    var fields = document.querySelectorAll(".el-dialog .paper-editor input[placeholder],textarea[placeholder]");
    var arr = [];
    for (var i=0;i<Math.min(3,fields.length);i++) arr.push({ph:fields[i].placeholder, val:fields[i].value});
    return arr;
  })()
})
