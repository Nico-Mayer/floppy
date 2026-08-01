# Verify the Windows dev env for the desktop Tauri build (Windows is desktop
# only; mobile builds run on macOS). Self-heals the rustup default.
$ok = 0
Write-Host "== floppy doctor (Windows) =="

# A bare rustc (the env outside mise) must resolve, or Tauri's build phases fail.
$host_line = (& cmd /c "set RUSTUP_TOOLCHAIN=& rustc -vV" 2>$null | Select-String '^host:')
if ($host_line) {
  Write-Host "ok   rustc resolves without RUSTUP_TOOLCHAIN"
} else {
  Write-Host "FAIL bare rustc broken -> pinning rustup default"
  $tc = ((rustup show active-toolchain) -split '\s+')[0]
  rustup default $tc; if ($LASTEXITCODE -ne 0) { $ok = 1 }
}

# Desktop needs the MSVC linker (link.exe from Visual Studio Build Tools).
if (Get-Command link.exe -ErrorAction SilentlyContinue) { Write-Host "ok   MSVC link.exe found" }
else { Write-Host "warn link.exe not found -> install Visual Studio Build Tools (Desktop C++)" }

if ($ok -eq 0) { Write-Host "== all good ==" } else { Write-Host "== issues above; apply the fixes and re-run ==" }
exit $ok
