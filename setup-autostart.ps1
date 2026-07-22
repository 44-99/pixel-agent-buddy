# Pixel Agent Buddy - 开机自启动脚本
$projectDir = $PSScriptRoot
$targetPath = Join-Path $projectDir "start.bat"
$shortcutPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Pixel Agent Buddy.lnk"

# 创建启动目录
$startupDir = Split-Path $shortcutPath -Parent
if (!(Test-Path $startupDir)) {
    New-Item -ItemType Directory -Force -Path $startupDir | Out-Null
}

# 创建快捷方式
$WScriptObj = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptObj.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetPath
$Shortcut.WorkingDirectory = $projectDir
$Shortcut.Description = "Pixel Agent Buddy"
$Shortcut.IconLocation = (Join-Path $projectDir "assets\icon.ico")
$Shortcut.Save()

Write-Host "OK - Autostart shortcut created at:" -ForegroundColor Green
Write-Host $shortcutPath -ForegroundColor Yellow
