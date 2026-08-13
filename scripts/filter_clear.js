// filter_clear: 清空所有筛选条件
// 调用：cp scripts/filter_clear.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
// 期望：clicked == true
(function(){
  var btn = document.querySelector(".workspace-filter-clear");
  if (btn) {
    btn.click();
    return JSON.stringify({clicked: true});
  }
  return JSON.stringify({clicked: false, reason: "无清空筛选按钮（可能没筛选）"});
})()