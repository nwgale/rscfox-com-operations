// Step 5 verify: 校验保存结果
// 调用：osascript scripts/exec_js.scpt
// 期望：hasVisibleEditor=false && paperCount 比保存前 +1
// 重要：传入的 {CATEGORY_LABEL} 决定计数读哪个类别（如「论文」/「个人获奖」）
JSON.stringify({
  hasVisibleEditor: (function(){
    var d = document.querySelector(".el-dialog .paper-editor");
    if (!d) return false;
    var r = d.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  })(),
  paperCount: (function(){
    var items = document.querySelectorAll(".workspace-side-item");
    for (var i=0;i<items.length;i++){
      var lbl = items[i].querySelector(".workspace-side-item__label");
      if (lbl && lbl.textContent.trim() === "{CATEGORY_LABEL}") {
        var m = items[i].textContent.match(/(\d+)/);
        return m ? parseInt(m[1]) : null;
      }
    }
    return null;
  })()
})
