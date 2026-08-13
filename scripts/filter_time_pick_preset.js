// filter_time_pick_preset: 点时间预设按钮（如「过去五年」）
// 调用前用 sed 替换 {PRESET_LABEL}：
//   sed "s|{PRESET_LABEL}|过去五年|g" scripts/filter_time_pick_preset.js > /tmp/chrome_exec_js.js
// 注意：点完预设后仍需调用 filter_time_confirm.js 点完成，列表才会刷新
// 期望：clicked == true
(function(){
  var target = "{PRESET_LABEL}";
  var presets = document.querySelectorAll(".workspace-filter-time-preset");
  for (var i=0;i<presets.length;i++){
    if ((presets[i].textContent || "").trim() === target) {
      presets[i].click();
      return JSON.stringify({clicked: true, preset: target});
    }
  }
  return JSON.stringify({clicked: false, reason: "未找到预设: " + target});
})()