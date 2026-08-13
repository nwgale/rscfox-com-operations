// filter_time_confirm: 点时间面板的「完成」按钮
// 调用：cp scripts/filter_time_confirm.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
// 期望：clicked == true（且按钮之前不是 disabled）
// 注意：必须先调用 filter_time_pick_preset 或手动选日期，否则按钮是 disabled
(function(){
  var btn = document.querySelector(".workspace-filter-time-confirm");
  if (!btn) return JSON.stringify({clicked: false, reason: "未找到完成按钮"});
  if (btn.disabled) return JSON.stringify({clicked: false, reason: "完成按钮 disabled，请先选日期或预设"});
  btn.click();
  return JSON.stringify({clicked: true});
})()