// filter_time_open: 打开顶部「时间」筛选弹窗
// 调用：cp scripts/filter_time_open.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
// 期望：opened == true
(function(){
  var btns = document.querySelectorAll(".workspace-filter-trigger");
  for (var i=0;i<btns.length;i++){
    if ((btns[i].textContent || "").trim() === "时间") {
      btns[i].click();
      return JSON.stringify({opened: true});
    }
  }
  return JSON.stringify({opened: false, reason: "未找到时间按钮"});
})()