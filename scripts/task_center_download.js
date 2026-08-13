// task_center_download: 在任务中心找第一条已完成任务，点「下载」按钮
// 调用：cp scripts/task_center_download.js /tmp/chrome_exec_js.js && osascript scripts/exec_js.scpt
// 期望：clicked == true
// 副作用：浏览器开始下载 xlsx/zip/pdf 到 ~/Downloads
// 注意：导出任务完成后不会自动下载，必须手动点
(function(){
  // 先确认在任务中心
  if (location.href.indexOf("/task-center") < 0) {
    return JSON.stringify({clicked: false, reason: "当前不在任务中心"});
  }
  var rows = document.querySelectorAll(".task-center-row");
  for (var i=0;i<rows.length;i++){
    var statusText = (rows[i].textContent || "").trim();
    // 只下载已完成的任务
    if (statusText.indexOf("已完成") < 0) continue;
    var btns = rows[i].querySelectorAll("button, a");
    for (var j=0;j<btns.length;j++){
      if ((btns[j].textContent || "").trim() === "下载") {
        btns[j].click();
        return JSON.stringify({clicked: true, rowIdx: i});
      }
    }
  }
  return JSON.stringify({clicked: false, reason: "未找到已完成任务的下载按钮"});
})()