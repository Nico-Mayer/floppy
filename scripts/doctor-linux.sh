#!/usr/bin/env bash
# Verify the Linux dev env for desktop + Android Tauri builds.
# Android SDK paths must be configured outside mise.toml because their install
# locations vary by machine.
set -uo pipefail
ok=0
echo "== floppy doctor (Linux) =="

for command in rustc cargo node npm; do
  if command -v "$command" >/dev/null 2>&1; then
    echo "ok   $command on PATH"
  else
    echo "FAIL $command not on PATH"
    ok=1
  fi
done

# Tauri's Linux desktop build requires WebKitGTK and related system packages.
if pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
  echo "ok   webkit2gtk-4.1 available"
else
  echo "warn webkit2gtk-4.1 missing -> install the Tauri Linux prerequisites"
fi

# Android SDK/NDK are external system dependencies; mise supplies Java only.
[ -d "${ANDROID_HOME:-}" ] && echo "ok   ANDROID_HOME $ANDROID_HOME" || echo "warn ANDROID_HOME missing: ${ANDROID_HOME:-<unset>}"
[ -d "${NDK_HOME:-}" ] && echo "ok   NDK_HOME $NDK_HOME" || echo "warn NDK_HOME missing: ${NDK_HOME:-<unset>}"
command -v adb >/dev/null 2>&1 && echo "ok   adb on PATH" || echo "warn adb not on PATH"
command -v emulator >/dev/null 2>&1 && echo "ok   emulator on PATH" || echo "warn emulator not on PATH"

if command -v ss >/dev/null 2>&1 && ss -ltn '( sport = :1420 )' 2>/dev/null | grep -q ':1420'; then
  echo "warn :1420 already bound -> mise run kill-port"
else
  echo "ok   dev port :1420 free"
fi

[ "$ok" = 0 ] && echo "== all good ==" || echo "== issues above; apply the fixes and re-run =="
exit "$ok"
