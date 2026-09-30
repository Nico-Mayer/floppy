## 1. Android release signing

- [ ] 1.1 Add `scripts/keystore-android.sh`: generate `~/.android/floppy-release.jks` with `keytool -genkeypair` (alias `floppy`, RSA 2048, 10000 days) if absent, generate a password, write `src-tauri/gen/android/keystore.properties` (`keyAlias`, `password`, `storeFile`) if absent. Idempotent, `set -euo pipefail`.
- [ ] 1.2 Edit `src-tauri/gen/android/app/build.gradle.kts`: import `java.io.FileInputStream`, add `signingConfigs.create("release")` that loads `rootProject.file("keystore.properties")` only when it exists, and assign `signingConfig` in `buildTypes.release` only when the file exists.
- [ ] 1.3 Verify `npm run tauri android build -- --apk --target aarch64` with no `keystore.properties` still configures Gradle, then run `keystore:android` and confirm the release APK is signed (`apksigner verify --print-certs`).
- [ ] 1.4 Add `keystore:android` task to `mise.toml` under a new `# --- install ---` section.

## 2. Android install task

- [ ] 2.1 Add `scripts/install-android.sh` with a `--debug` flag: require exactly one `device`-state entry from `adb devices` (honor `ANDROID_SERIAL`), map `ro.product.cpu.abi` to a tauri target, run `keystore-android.sh` when release and no properties file, build with `npm run tauri android build -- --apk --target <t>` (plus `--debug`), install with `adb install -r`, fall back to uninstall + install on `INSTALL_FAILED_UPDATE_INCOMPATIBLE` with a data-loss notice, then `adb shell monkey -p com.nimayer.floppy 1` to launch.
- [ ] 2.2 Add `install:android` task to `mise.toml` with a `usage` block for `--debug`, description mentioning release default and the `ws://` broker caveat.
- [ ] 2.3 Test on the connected moto g06: release install, launch, unplug, app works. Then `--debug` install, then release again to exercise the incompatible-signature path.

## 3. iOS install task

- [ ] 3.1 Add `scripts/install-ios.sh`: refuse on non-macOS, list physical paired devices via `xcrun devicectl list devices --json-output`, honor `IOS_DEVICE` (udid or name) when several, error with trust / Developer Mode hints when none, build with `npm run tauri ios build -- --export-method debugging --ci` (plus `--debug`), install `src-tauri/gen/apple/build/floppy.ipa` with `devicectl device install app`, then `devicectl device process launch --device <udid> com.nimayer.floppy`.
- [ ] 3.2 Add `install:ios` task to `mise.toml` with the same `--debug` usage block.
- [ ] 3.3 Test on a connected iPhone: install, launch, unplug, app works. Note the iOS version tested.

## 4. Doctor and docs

- [ ] 4.1 Extend `scripts/doctor-macos.sh`: warn-only checks for `keytool`, `xcrun devicectl`, and keystore configuration (`keystore.properties` present and its `storeFile` exists).
- [ ] 4.2 Extend `scripts/doctor-linux.sh` with the `keytool` and keystore checks.
- [ ] 4.3 Add the three tasks to the mise task list in `openspec/config.yaml` context if tasks are enumerated there, and mention the `tauri android init` caveat in the gradle edit's script header comment.
- [ ] 4.4 Run `mise run doctor`, `mise run lint`, and confirm `git status` shows no keystore or properties file.
