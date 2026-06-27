// Step 5 baseline: 在点「完成」之前读取侧边栏对应类别的计数
// 调用：osascript scripts/exec_js.scpt
// 重要：传入的 {CATEGORY_LABEL} 必须替换为实际类别名
// 返回：{categoryCount: N1} —— 保存前的基线
JSON.stringify({
  categoryCount: (function(){
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
