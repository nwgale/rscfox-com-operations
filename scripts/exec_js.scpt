set jsScript to do shell script "cat /tmp/chrome_exec_js.js"

tell application "Google Chrome"
	execute active tab of front window javascript jsScript
end tell
