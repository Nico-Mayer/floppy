$ErrorActionPreference = "Stop"

Write-Host "Building..."
wails3 build

$exe = Resolve-Path "./bin/floppy.exe"

$installDir = Join-Path $env:LOCALAPPDATA "Programs\\floppy"
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

$target = Join-Path $installDir "floppy.exe"
Copy-Item $exe $target -Force

$startMenu = Join-Path $env:APPDATA "Microsoft\\Windows\\Start Menu\\Programs"
$shortcut = Join-Path $startMenu "floppy.lnk"

$ws = New-Object -ComObject WScript.Shell
$link = $ws.CreateShortcut($shortcut)
$link.TargetPath = $target
$link.WorkingDirectory = $installDir
$link.IconLocation = $target
$link.Save()

Write-Host ""
Write-Host "Installed:"
Write-Host "  $target"
Write-Host "Shortcut:"
Write-Host "  $shortcut"
Write-Host ""
Write-Host "You can now search for 'floppy' from the Start Menu."
