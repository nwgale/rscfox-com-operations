-- chrome_auto_init.scpt
-- 为 rscfox 自动化准备/确认一个专用的 Chrome 窗口，记录其 window id。
-- 策略：始终创建一个新窗口，专供自动化使用，避免与用户正在操作的 Chrome 窗口抢焦点。
-- 参数：可选，URL（导航到的目标页面，默认 works.rscfox.com 成果管理页）
-- 输出: window_id（写入 /tmp/chrome_auto_win_id.txt）

property defaultURL : "https://works.rscfox.com/achievements"

on run argv
	set targetURL to defaultURL
	if (count of argv) > 0 then set targetURL to item 1 of argv
	
	tell application "Google Chrome"
		-- 关闭之前可能残留的自动化窗口（如果存在）
		try
			set oldId to (do shell script "cat /tmp/chrome_auto_win_id.txt 2>/dev/null || echo ''")
			if oldId is not "" then
				try
					close window id (oldId as integer)
				end try
			end if
		end try
		
		-- 创建全新的自动化专用窗口，然后导航到目标 URL
		set newWin to make new window
		set wId to id of newWin
		set URL of active tab of newWin to targetURL
		do shell script "echo " & wId & " > /tmp/chrome_auto_win_id.txt"
		
		delay 1.5
		return wId
	end tell
end run
