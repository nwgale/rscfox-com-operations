// Step 2 verify: 校验弹窗是否真实打开 + 弹窗内类别
// 调用：osascript scripts/exec_js.scpt
// 期望：hasVisibleEditor=true && editorTitle=="新增成果" && dialogCategory==用户指定类别
JSON.stringify({
  hasVisibleEditor: (function(){
    var d = document.querySelector(".el-dialog .paper-editor");
    if (!d) return false;
    var r = d.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  })(),
  editorTitle: (function(){
    var t = document.querySelector(".el-dialog .paper-editor .paper-editor__title");
    return t ? t.textContent.trim() : null;
  })(),
  dialogCategory: (function(){
    var s = document.querySelector(".el-dialog .paper-editor .paper-editor__achievement-select");
    return s ? s.textContent.trim() : null;
  })()
})
