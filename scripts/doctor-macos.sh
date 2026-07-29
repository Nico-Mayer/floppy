#!/usr/bin/env bash
# Verify the macOS dev env for iOS + Android + desktop Tauri builds.
# Invoked by `mise run doctor` on macOS. Self-heals the rustup default and
# missing iOS Rust targets; other issues print a fix and exit non-zero.
set -uo pipefail
ok=0
echo "== floppy doctor (macOS) =="

# 1. xcode-select must point at Xcode.app, not CommandLineTools, or Xcode's
#    "Build Rust Code" script phase runs in a broken developer dir.
dev="$(xcode-select -p 2>/dev/null || true)"
if [ "$dev" != "/Applications/Xcode.app/Contents/Developer" ]; then
  echo "FAIL xcode-select -> $dev"
  echo "     fix: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  ok=1
else
  echo "ok   xcode-select -> $dev"
fi

# 2. A bare rustc (no RUSTUP_TOOLCHAIN, i.e. the env Xcode/Gradle see) must work.
# Capture output first -- piping into `grep -q` under pipefail SIGPIPEs rustc.
hostline="$(env -u RUSTUP_TOOLCHAIN rustc -vV 2>/dev/null | grep '^host:' || true)"
if [ -n "$hostline" ]; then
  echo "ok   rustc resolves without RUSTUP_TOOLCHAIN"
else
  echo "FAIL bare rustc broken -> pinning rustup default"
  rustup default "$(rustup show active-toolchain | awk '{print $1}')" && echo "     fixed" || ok=1
fi

# 3. iOS Rust targets.
installed="$(rustup target list --installed 2>/dev/null)"
for t in aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios; do
  if printf '%s\n' "$installed" | grep -qx "$t"; then
    echo "ok   target $t"
  else
    echo ".... adding target $t"
    rustup target add "$t" || ok=1
  fi
done

# 4. Android SDK/NDK + tools on PATH (warn only; only needed for android builds).
[ -d "${ANDROID_HOME:-}" ] && echo "ok   ANDROID_HOME $ANDROID_HOME" || echo "warn ANDROID_HOME missing: ${ANDROID_HOME:-<unset>} (install Android Studio for android builds)"
[ -d "${NDK_HOME:-}" ] && echo "ok   NDK_HOME $NDK_HOME" || echo "warn NDK_HOME missing: ${NDK_HOME:-<unset>}"
# tauri/cargo-mobile2 call bare `adb`/`emulator`; without them on PATH no device is found.
command -v adb >/dev/null 2>&1 && echo "ok   adb on PATH" || echo "warn adb not on PATH -> android device detection will find nothing (reopen shell to pick up mise PATH)"
command -v emulator >/dev/null 2>&1 && echo "ok   emulator on PATH" || echo "warn emulator not on PATH"

[ "$ok" = 0 ] && echo "== all good ==" || echo "== issues above; apply the fixes and re-run =="
exit "$ok"
