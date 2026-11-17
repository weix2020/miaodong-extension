-- 秒懂安装器：双击 DMG 后运行，选择安装 Chrome 版或 Safari 版
on run
	set mePOSIX to POSIX path of (path to me)
	set rootPOSIX to do shell script "dirname " & quoted form of mePOSIX
	set chromeExtPath to rootPOSIX & "/Chrome扩展"
	set safariAppPath to rootPOSIX & "/Miaodong.app"

	set choices to choose from list {"Chrome 浏览器版", "Safari 浏览器版"} with title "安装秒懂" with prompt "选择要安装的版本：" default items {"Chrome 浏览器版"} OK button name "安装" cancel button name "退出"
	if choices is false then return
	set picked to item 1 of choices

	if picked is "Safari 浏览器版" then
		try
			do shell script "rm -rf '/Applications/Miaodong.app' && cp -R " & quoted form of safariAppPath & " /Applications/Miaodong.app"
			do shell script "open /Applications/Miaodong.app"
			display dialog "已把 Miaodong.app 装到「应用程序」。" & return & return & "启用步骤：" & return & "1. 在弹出的窗口点「在 Safari 中启用」" & return & "2. Safari 设置 › 扩展 › 秒懂 › 允许" & return & "3. 把「所有网站」权限设为「允许」" buttons {"完成"} default button 1 with title "安装秒懂 · Safari 版"
		on error
			do shell script "open " & quoted form of safariAppPath
			display dialog "无法复制到「应用程序」（可能需要管理员权限），已直接打开安装包里的版本。" & return & return & "启用步骤：" & return & "1. 在弹出的窗口点「在 Safari 中启用」" & return & "2. Safari 设置 › 扩展 › 秒懂 › 允许" & return & "3. 把「所有网站」权限设为「允许」" buttons {"完成"} default button 1 with title "安装秒懂 · Safari 版"
		end try
	else
		set the clipboard to chromeExtPath
		set opened to false
		try
			do shell script "open -a 'Google Chrome' 'chrome://extensions'"
			set opened to true
		end try
		if opened then
			display dialog "已打开 Chrome 扩展页，并把扩展文件夹路径复制到了剪贴板。" & return & return & "安装步骤：" & return & "1. 打开右上角「开发者模式」" & return & "2. 点「加载已解压的扩展程序」" & return & "3. 在选择框按 Cmd+Shift+G 粘贴路径，或手动选择安装包里的「Chrome扩展」文件夹" buttons {"完成"} default button 1 with title "安装秒懂 · Chrome 版"
		else
			display dialog "未检测到 Google Chrome。" & return & return & "请先安装 Chrome，然后在 chrome://extensions 打开「开发者模式」，点「加载已解压的扩展程序」，选择安装包里的「Chrome扩展」文件夹。" buttons {"好"} default button 1 with title "安装秒懂 · Chrome 版"
		end if
	end if
end run
