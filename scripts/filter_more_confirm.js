// filter_more_confirm: 点更多筛选面板的「确定」按钮
// 调用：cp scripts/filter_more_confirm.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
// 期望：clicked == true
(function(){
  var btn = document.querySelector(".workspace-more-filter-panel__confirm");
  if (!btn) return JSON.stringify({clicked: false, reason: "未找到更多筛选的确定按钮"});
  btn.click();
  return JSON.stringify({clicked: true});
})()