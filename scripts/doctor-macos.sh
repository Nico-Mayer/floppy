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

# 3. Mobile Rust targets (iOS + Android).
installed="$(rustup target list --installed 2>/dev/null)"
for t in aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios \
         aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android; do
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
# tauri/cargo-mobile2 call bare `adb`/`emulator`; mise puts the SDK CLI on PATH
# (mise.toml [env] _.path), so these should resolve inside the repo.
command -v adb >/dev/null 2>&1 && echo "ok   adb on PATH" || echo "warn adb not on PATH -> run inside the repo so mise's PATH applies"
command -v emulator >/dev/null 2>&1 && echo "ok   emulator on PATH" || echo "warn emulator not on PATH -> run inside the repo so mise's PATH applies"

# ANDROID_USER_HOME must be pinned, or the SDK CLI and Android Studio disagree on
# where AVDs live (XDG_CONFIG_HOME/.android vs ~/.android) and boot different ones.
if [ "${ANDROID_USER_HOME:-}" = "$HOME/.android" ]; then
  echo "ok   ANDROID_USER_HOME -> $ANDROID_USER_HOME"
else
  echo "warn ANDROID_USER_HOME is '${ANDROID_USER_HOME:-<unset>}' (expected $HOME/.android); AVDs may split"
fi
# The stray XDG copy from before the pin -- remove it so only ~/.android remains.
[ -d "${XDG_CONFIG_HOME:-$HOME/.config}/.android/avd" ] \
  && echo "warn duplicate AVDs at ${XDG_CONFIG_HOME:-$HOME/.config}/.android/avd -> rm -rf that dir" \
  || echo "ok   no duplicate XDG AVD dir"
# At least one AVD, or there's nothing to boot.
if command -v emulator >/dev/null 2>&1 && [ -n "$(emulator -list-avds 2>/dev/null)" ]; then
  echo "ok   AVD present: $(emulator -list-avds 2>/dev/null | tr '\n' ' ')"
else
  echo "warn no AVD found -> mise run avd:create"
fi

# 5. Android build-env traps (warn only).
#    a) A Gradle daemon started outside a mise shell (e.g. by Android Studio) has
#       no mise node on its PATH. Gradle resolves the bare `npm` in the beforeDev
#       command against the *daemon's* PATH, not this shell's, and fails with
#       `A problem occurred starting process 'command 'npm''`. Stopping the daemon
#       forces a fresh one to inherit this shell's PATH.
if pgrep -f 'GradleDaemon' >/dev/null 2>&1; then
  echo "warn Gradle daemon running -> may not resolve npm on its PATH; fix: (cd src-tauri/gen/android && ./gradlew --stop)"
else
  echo "ok   no stale Gradle daemon"
fi
#    b) A killed dev run leaks Vite on :1420; the next run cannot bind it.
if lsof -ti tcp:1420 >/dev/null 2>&1; then
  echo "warn :1420 already bound -> a dev run leaked Vite; fix: mise run kill-port"
else
  echo "ok   dev port :1420 free"
fi

[ "$ok" = 0 ] && echo "== all good ==" || echo "== issues above; apply the fixes and re-run =="
exit "$ok"
