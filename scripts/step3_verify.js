// Step 3 verify: 校验文件是否上传成功
// 调用：osascript scripts/exec_js.scpt
// 期望：attachmentCardCount >= 1 且 pageFilterText 中的 N == attachmentCardCount
// 注意：不能用 input.files 判断（el-upload 会清空）
// 注意：不能用 el-upload-list__item（站点用的是自定义 className）
JSON.stringify({
  attachmentCardCount: document.querySelectorAll(".el-dialog .paper-editor .paper-editor__attachment-card").length,
  pageFilterText: (document.querySelector(".el-dialog .paper-editor .paper-editor__page-filter") || {}).textContent || null
})
