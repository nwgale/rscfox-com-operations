// Step 2 click: 点击「+ 新增成果」按钮
// 调用：osascript scripts/exec_js.scpt
// 行为：找到按钮文本含「新增」+「成果」字样的按钮并点击
// 返回：{clicked:true, text:"..."} 或 {notFound:true}
(function(){
  var btns = document.querySelectorAll("button");
  for (var i=0;i<btns.length;i++){
    var t = (btns[i].textContent || "").trim();
    if (t === "+ 新增成果" || (t.indexOf("新增") >= 0 && t.indexOf("成果") >= 0)) {
      btns[i].click();
      return JSON.stringify({clicked:true, text:t});
    }
  }
  return JSON.stringify({notFound:true});
})()
