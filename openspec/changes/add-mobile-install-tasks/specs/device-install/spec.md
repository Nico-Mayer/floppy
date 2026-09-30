## ADDED Requirements

### Requirement: One task installs a standalone build on a connected device

The repository SHALL provide a developer task per mobile platform (`install:android`,
`install:ios`) that builds the app from source and installs it on the single connected
physical device, so the app runs without the development server or a USB cable afterwards.
The task SHALL install a release build by default and SHALL install the debug variant when
asked with `--debug`.

#### Scenario: Android device install

- **WHEN** one authorized Android device is attached over USB and `mise run install:android` runs
- **THEN** a release APK for that device's ABI is built, installed with `adb`, and the app
  launches from the device's launcher with no dev server running on the host

#### Scenario: iOS device install

- **WHEN** one paired iPhone is attached over USB and `mise run install:ios` runs on macOS
- **THEN** a signed IPA is built with the `debugging` export method, installed with
  `xcrun devicectl`, and launched on the device

#### Scenario: Debug variant on request

- **WHEN** `mise run install:android -- --debug` runs
- **THEN** the debug APK is built and installed and no release keystore is required

#### Scenario: No device attached

- **WHEN** an install task runs and no eligible physical device is found
- **THEN** the task exits non-zero before building and tells the user how to attach and
  authorize a device

#### Scenario: More than one device attached

- **WHEN** an install task finds more than one eligible device
- **THEN** the task exits non-zero and names the way to pick one (`ANDROID_SERIAL` on
  Android, `IOS_DEVICE` on iOS)

### Requirement: Android release builds are signed with a local keystore

Android release builds SHALL be signed using a signing config read from the gitignored
`src-tauri/gen/android/keystore.properties`. A `keystore:android` task SHALL generate a
development keystore outside the repository and write that properties file. The build
SHALL still configure when the properties file is absent, leaving the release variant
unsigned rather than failing Gradle configuration.

#### Scenario: First install on a fresh clone

- **WHEN** `install:android` runs and `keystore.properties` does not exist
- **THEN** the task generates the keystore and properties file first, then builds and
  installs a signed release APK

#### Scenario: Keystore generation is idempotent

- **WHEN** `keystore:android` runs and a keystore already exists at the configured path
- **THEN** it leaves the keystore untouched and only rewrites `keystore.properties` if it
  is missing

#### Scenario: Dev build without a keystore

- **WHEN** `tauri android dev` runs on a clone that has no `keystore.properties`
- **THEN** Gradle configures and the debug build proceeds

#### Scenario: Nothing secret is committed

- **WHEN** the keystore and properties file have been generated
- **THEN** `git status` shows neither file, and the keystore lives under the user's home
  directory rather than the repository

### Requirement: Reinstall replaces the app in place

Installing over an existing install of the same signing identity SHALL keep the app's
data. If the device rejects the update because the signing identity changed, the task
SHALL uninstall and reinstall, and SHALL say that device data was lost.

#### Scenario: Same identity

- **WHEN** `install:android` runs on a device that already has floppy signed by the same keystore
- **THEN** the app is updated and its stored identity and paired devices are preserved

#### Scenario: Changed identity

- **WHEN** the device reports `INSTALL_FAILED_UPDATE_INCOMPATIBLE`
- **THEN** the task uninstalls `com.nimayer.floppy`, installs again, and prints that app
  data on the device was reset

### Requirement: Doctor reports install prerequisites

The toolchain doctor SHALL report the presence of `keytool`, `adb`, and on macOS
`xcrun devicectl`, and SHALL report whether the Android release keystore is configured.
These checks SHALL warn rather than fail, matching the existing Android checks.

#### Scenario: Missing keystore

- **WHEN** `mise run doctor` runs before `keystore:android` has ever run
- **THEN** it warns that release signing is not configured and names `keystore:android`
  as the fix, and still exits zero if everything else passes
