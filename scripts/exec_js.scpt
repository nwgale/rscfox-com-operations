set jsScript to do shell script "cat /tmp/chrome_exec_js.js"

tell application "Google Chrome"
	try
		set wId to (do shell script "cat /tmp/chrome_auto_win_id.txt 2>/dev/null") as integer
		set w to window id wId
	on error
		return "ERROR: Automation window not found. Run 'osascript scripts/chrome_auto_init.scpt [URL]' first."
	end try
	
	set jsResult to execute active tab of w javascript jsScript
	return jsResult
end tell
