// Step 1 verify: 校验侧边栏激活类别
// 调用：osascript scripts/exec_js.scpt
// 期望：返回值 activeCategory == 用户指定的类别
JSON.stringify({
  activeCategory: document.querySelector(".workspace-side-item.is-active .workspace-side-item__label").textContent.trim()
})
