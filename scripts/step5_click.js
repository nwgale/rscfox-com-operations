// Step 5 click: 点击「完成」按钮
// 调用：osascript scripts/exec_js.scpt
// 行为：找到弹窗内文本含「完成」的按钮并点击
// 返回：{clicked:"完成"} 或 {notFound:true}
(function(){
  var btns = document.querySelectorAll(".el-dialog .paper-editor button");
  for (var i=0;i<btns.length;i++){
    var t = (btns[i].textContent || "").trim();
    if (t === "完成" || t.indexOf("完成") >= 0) {
      btns[i].click();
      return JSON.stringify({clicked:t});
    }
  }
  return JSON.stringify({notFound:true});
})()
