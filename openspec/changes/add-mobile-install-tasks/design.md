## Context

`mise.toml` already has `dev:*` (tethered dev) and `build:*` (artifact only) tasks per
platform. `tauri android build` emits `app/build/outputs/apk/<abi>/release/app-<abi>-release.apk`,
but `build.gradle.kts` has no release signing config, so the APK is unsigned and cannot be
installed. `tauri ios build` already works: `tauri.conf.json` carries the development
team, `ExportOptions.plist` uses `method=debugging`, and a `gen/apple/build/floppy.ipa`
exists from a previous run. The Mac has `xcrun devicectl` (Xcode 15+) and `ios-deploy`.

Current state of the phone in the room: a moto g06 over USB (`adb devices` shows it as
`device`), with no iPhone attached at the time of writing.

## Goals / Non-Goals

**Goals:**

- `mise run install:android` and `mise run install:ios` each go from source to a running,
  untethered app on the connected device in one command.
- Release builds are signed on a fresh clone with no manual keystore steps.
- Nothing secret is committed; the workflow stays gitignore-safe.
- Clear failure messages when no device is attached or a tool is missing.

**Non-Goals:**

- App Store / Play Store distribution, upload keys, or CI signing secrets.
- Wireless (ADB over Wi-Fi or devicectl tunnel) install. USB only.
- Installing on emulators or simulators. `dev:*` and `avd:*` cover those.
- Windows: `run_windows` variants are out of scope; the tasks error out there.

## Decisions

### D1: Install a release build by default, debug on request

The point of the task is an app that survives unplugging and behaves like the shipped
one. Release is minified, non-debuggable, and disallows cleartext traffic; that is what we
want to test on hardware. The debug variant is kept behind `--debug` because it needs no
keystore and is useful when release signing is broken.

Alternative considered: always install debug. Rejected because it never exercises the
release Gradle config and would leave the unsigned-release problem in place.

### D2: Sign Android release builds with a local, auto-generated keystore

Follow the Tauri Android signing guide: `build.gradle.kts` gains
`signingConfigs.create("release")` that loads `rootProject.file("keystore.properties")`,
and `buildTypes.release` uses it. The properties file and the keystore live outside git.

Where the keystore lives: `~/.android/floppy-release.jks`, alongside Android's own
`debug.keystore`. `keystore.properties` points at it with an absolute path. Keeping the
keystore out of the repo tree means `git clean -fdx` does not delete it, and a reinstall
does not change the signing identity, which would force an uninstall on the device.

The signing block must tolerate a missing `keystore.properties`, otherwise every build
that does not need release signing (including `tauri android dev`) fails at Gradle
configuration time. Missing file means: no `signingConfig` assigned, release stays
unsigned, and the install task refuses with a message pointing at `keystore:android`.

`keystore:android` runs `keytool -genkeypair` with a fixed alias (`floppy`) and a
generated password, writes `keystore.properties`, and is idempotent. `install:android`
calls it when the properties file is absent.

Alternatives: reuse `~/.android/debug.keystore` for release. Rejected: it has a
well-known password and mixes identities. Commit a keystore. Rejected: Tauri docs warn
against it, and there is no reason to share a dev signing key.

### D3: Build only the connected device's ABI

`tauri android build --apk --target <abi>` with the ABI mapped from
`adb shell getprop ro.product.cpu.abi` (`arm64-v8a` → `aarch64`, `armeabi-v7a` → `armv7`,
`x86_64` → `x86_64`, `x86` → `i686`). A universal build compiles four Rust targets and takes
several times longer; one target keeps the loop short. The APK path is derived from the
chosen target and variant.

`adb install -r` replaces an existing install in place. If the signature changed (for
example after regenerating the keystore), adb fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`;
the helper detects that string, uninstalls `com.nimayer.floppy`, and installs again.

Device selection: exactly one `device`-state entry in `adb devices` is required. With
zero, the task tells the user to plug in and authorize. With several, it asks for
`ANDROID_SERIAL` (adb honors that env var natively).

### D4: iOS install through `xcrun devicectl`, not `ios-deploy`

`tauri ios build --export-method debugging --ci` produces `gen/apple/build/floppy.ipa`,
signed with the development team from `tauri.conf.json`. Install with
`xcrun devicectl device install app --device <udid> <ipa>`. `devicectl` ships with Xcode,
supports iOS 17+ devices with the new CoreDevice stack, and is the path Apple maintains.
`ios-deploy` is a Homebrew extra and relies on older tooling.

Device selection reads `xcrun devicectl list devices --json-output` and picks entries with
`hardwareProperties.reality == "physical"` and `connectionProperties.pairingState == "paired"`.
Zero or more than one is an error with a hint, same as Android. The task also runs
`launch app --device <udid> com.nimayer.floppy` after install so the user sees it start.

The `debugging` export method is the right one: it targets registered development
devices and needs only the development team, which is already configured.

### D5: One bash helper per platform under `scripts/`

Task bodies with device parsing, ABI mapping, and error recovery are too long for
`mise.toml` inline `run` blocks and untestable there. `scripts/install-android.sh` and
`scripts/install-ios.sh` take the flags, `mise.toml` tasks stay one-liners with `usage`
blocks for `--debug`, consistent with `avd:start`. The keystore generator is
`scripts/keystore-android.sh`.

### D6: Doctor learns the install prerequisites

`doctor-macos.sh` and `doctor-linux.sh` check `keytool` (comes with the mise-managed
Temurin JDK), `adb`, and on macOS `xcrun devicectl`. They report whether
`keystore.properties` exists and whether its `storeFile` is present. Warn-only, in line
with the existing Android checks.

## Risks / Trade-offs

- [Gradle config edit is in a Tauri-generated file] → `gen/android` is checked in and Tauri
  does not regenerate it unless `tauri android init` is rerun. Note in the script header
  that `init` will drop the block.
- [Release build is slow the first time] → single-ABI build plus cargo cache. Document
  `--debug` for quick iteration.
- [Regenerated keystore breaks in-place upgrade] → keystore lives in `~/.android`, and the
  helper falls back to uninstall + install on `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. App data
  on the device is lost in that case; the message says so.
- [iOS device not trusted or Developer Mode off] → `devicectl` errors are verbose; the
  helper prints the two usual fixes (trust the Mac, enable Developer Mode in Settings >
  Privacy & Security) when the device list is empty.
- [`devicectl` needs iOS 17+] → older iPhones fail. Acceptable for a personal dev loop; the
  message names `ios-deploy` as the manual alternative.
- [Release APK does not set `usesCleartextTraffic`] → the broker URL defaults to `wss://`
  so this does not matter in practice, but a local broker over `ws://` will not work from a
  release install. Documented in the task description.

## Open Questions

- None blocking. Whether `install:android` should also copy the APK to a stable path such
  as `dist/floppy.apk` for sideloading elsewhere can be decided during apply.
