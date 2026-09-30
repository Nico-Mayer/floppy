## ADDED Requirements

### Requirement: One task cuts a release from the commit history

The repository SHALL provide a `release` developer task that, on a clean `main` working
tree, derives the next version from the conventional commits since the previous tag,
updates the app version in `package.json` and `package-lock.json`, prepends a section to
`CHANGELOG.md`, commits, tags `v<version>`, and pushes the commit and tag. The task SHALL
pass through the tool's own flags so a dry run and an explicit bump (`--release-as`) are
available without editing the task.

#### Scenario: Ordinary release

- **WHEN** `mise run release` runs on `main` with a clean working tree and at least one
  conventional commit since the last tag
- **THEN** `package.json` carries the new version, `CHANGELOG.md` has a new top section
  listing those commits, a `chore(release): <version>` commit and a `v<version>` tag exist,
  and both are on `origin/main`

#### Scenario: Dry run

- **WHEN** `mise run release -- --dry-run` runs
- **THEN** the proposed version and changelog section are printed and no file, commit,
  tag, or push is produced

#### Scenario: Explicit bump

- **WHEN** `mise run release -- --release-as minor` runs
- **THEN** the minor version is bumped regardless of what the commits alone would pick

#### Scenario: Dirty tree or wrong branch

- **WHEN** `mise run release` runs with uncommitted changes or on a branch other than `main`
- **THEN** the task exits non-zero before touching the version, and says which check failed

### Requirement: A version tag builds desktop installers into a draft release

The repository SHALL provide a GitHub Actions workflow that runs on a pushed `v*` tag and
on manual dispatch. It SHALL build the desktop app for macOS on Apple Silicon, macOS on
Intel, Windows, and Linux using the node and rust versions pinned in `mise.toml`, and
SHALL upload every bundle Tauri produces for that platform to one draft GitHub release
whose tag is the pushed tag.

#### Scenario: Tag push

- **WHEN** a `v1.2.3` tag is pushed
- **THEN** a draft release `floppy v1.2.3` exists with, at least, a `.dmg` for
  `aarch64`, a `.dmg` for `x86_64`, an `.msi` and an `.exe` (nsis) installer, and a
  `.deb`, an `.rpm`, and an `.AppImage`

#### Scenario: Version agrees with the tag

- **WHEN** the workflow builds the tag `v1.2.3`
- **THEN** every bundle reports version `1.2.3`, taken from `package.json` through
  `tauri.conf.json`, and the release tag it uploads to is `v1.2.3`

#### Scenario: Partial failure

- **WHEN** one matrix job fails after another has already created the draft release
- **THEN** the other jobs still upload their bundles to that draft, the draft stays a
  draft, and re-running the failed job adds its bundles to the same release

#### Scenario: Manual run

- **WHEN** the workflow is started by hand from the Actions tab
- **THEN** it builds the checked-out ref and publishes to a draft release for the version
  in `package.json`

### Requirement: Release notes are the changelog section

The draft release body SHALL be the newest section of `CHANGELOG.md` at the tagged
commit, so the release page and the changelog contain the same text.

#### Scenario: Release body

- **WHEN** the draft release for `v1.2.3` is created
- **THEN** its body is the `CHANGELOG.md` section for `1.2.3` and nothing else

### Requirement: A macOS build opens without notarisation

Desktop bundles for macOS SHALL be ad-hoc signed so that a downloaded build on Apple
Silicon is not reported as damaged by Gatekeeper.

#### Scenario: Unsigned download on Apple Silicon

- **WHEN** a `.dmg` from the release is downloaded and opened on an Apple Silicon Mac
  with no developer certificate involved
- **THEN** macOS shows its unidentified-developer prompt rather than a "damaged" error,
  and the app runs once allowed
