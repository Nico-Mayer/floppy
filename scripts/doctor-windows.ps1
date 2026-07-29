# Verify the Windows dev env for Android + desktop Tauri builds.
# Invoked by `mise run doctor` on Windows. Self-heals the rustup default and
# missing Android Rust targets; other issues print a fix.
$ok = 0
Write-Host "== floppy doctor (Windows) =="

# 1. A bare rustc (the env Gradle sees for android builds) must work.
$host_line = (& cmd /c "set RUSTUP_TOOLCHAIN=& rustc -vV" 2>$null | Select-String '^host:')
if ($host_line) {
  Write-Host "ok   rustc resolves without RUSTUP_TOOLCHAIN"
} else {
  Write-Host "FAIL bare rustc broken -> pinning rustup default"
  $tc = ((rustup show active-toolchain) -split '\s+')[0]
  rustup default $tc; if ($LASTEXITCODE -ne 0) { $ok = 1 }
}

# 2. Android Rust targets.
$installed = rustup target list --installed
foreach ($t in @('aarch64-linux-android','armv7-linux-androideabi','i686-linux-android','x86_64-linux-android')) {
  if ($installed -contains $t) { Write-Host "ok   target $t" }
  else { Write-Host ".... adding target $t"; rustup target add $t; if ($LASTEXITCODE -ne 0) { $ok = 1 } }
}

# 3. Desktop needs the MSVC linker (link.exe from Visual Studio Build Tools).
if (Get-Command link.exe -ErrorAction SilentlyContinue) { Write-Host "ok   MSVC link.exe found" }
else { Write-Host "warn link.exe not found -> install Visual Studio Build Tools (Desktop C++) for desktop builds" }

# 4. Android SDK/NDK + tools on PATH (warn only).
if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) { Write-Host "ok   ANDROID_HOME $env:ANDROID_HOME" }
else { Write-Host "warn ANDROID_HOME missing: $env:ANDROID_HOME (install Android Studio for android builds)" }
if ($env:NDK_HOME -and (Test-Path $env:NDK_HOME)) { Write-Host "ok   NDK_HOME $env:NDK_HOME" }
else { Write-Host "warn NDK_HOME missing: $env:NDK_HOME" }
# tauri/cargo-mobile2 call bare `adb`/`emulator`; without them on PATH no device is found.
if (Get-Command adb -ErrorAction SilentlyContinue) { Write-Host "ok   adb on PATH" }
else { Write-Host "warn adb not on PATH -> android device detection will find nothing (reopen shell to pick up mise PATH)" }
if (Get-Command emulator -ErrorAction SilentlyContinue) { Write-Host "ok   emulator on PATH" }
else { Write-Host "warn emulator not on PATH" }

if ($ok -eq 0) { Write-Host "== all good ==" } else { Write-Host "== issues above; apply the fixes and re-run ==" }
exit $ok
