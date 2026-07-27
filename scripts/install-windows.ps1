$ErrorActionPreference = "Stop"

Write-Host "Building..."
wails3 build

$exe = Resolve-Path "./bin/floppy.exe"

$installDir = Join-Path $env:LOCALAPPDATA "Programs\\floppy"
$startMenu = Join-Path $env:APPDATA "Microsoft\\Windows\\Start Menu\\Programs"
$shortcut = Join-Path $startMenu "floppy.lnk"

# Remove the previous install first, so files dropped by an older version
# cannot linger, and so the exe is not locked while we copy over it.
Get-Process -Name floppy -ErrorAction SilentlyContinue | Stop-Process -Force
if (Test-Path $installDir) {
    Write-Host "Removing previous install at $installDir"
    Remove-Item $installDir -Recurse -Force
}
if (Test-Path $shortcut) { Remove-Item $shortcut -Force }

New-Item -ItemType Directory -Force -Path $installDir | Out-Null

$target = Join-Path $installDir "floppy.exe"
Copy-Item $exe $target -Force

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
