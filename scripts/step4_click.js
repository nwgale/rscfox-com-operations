// Step 4 click: 点击「AI 识别」按钮
// 调用：osascript scripts/exec_js.scpt
// 行为：点击 .paper-editor__recognize 按钮
// 返回：{clicked:true} 或 {notFound:true}
(function(){
  var btn = document.querySelector(".el-dialog .paper-editor .paper-editor__recognize");
  if (!btn) return JSON.stringify({notFound:true});
  btn.click();
  return JSON.stringify({clicked:true});
})()
