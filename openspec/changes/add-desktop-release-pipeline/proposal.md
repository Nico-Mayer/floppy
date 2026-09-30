## Why

There is no way to ship floppy to a desktop today: no CI, no tags, and `mise run build`
stops at an artifact on one machine. A release should be one command on the laptop that
bumps the version from the commit history, writes the changelog, and lets GitHub build
and publish installers for macOS, Windows, and Linux.

## What Changes

- Add `.github/workflows/release.yml`: on a `v*` tag push (or a manual run) build the
  desktop app on a four-way matrix with `tauri-apps/tauri-action@v1` and upload the
  bundles to a draft GitHub release named after the tag.
- Add a `release` task to `mise.toml` that checks the tree is clean and on `main`, runs
  `commit-and-tag-version` (conventional commits in, version bump + `CHANGELOG.md` +
  tag out), and pushes the commit and tag so the workflow starts.
- Install `commit-and-tag-version` as a mise tool next to openspec.
- Turn on macOS ad-hoc signing in `tauri.conf.json` so an unsigned Apple Silicon
  download opens instead of being reported as damaged.
- The release body is the newest `CHANGELOG.md` section, so the GitHub release and the
  changelog say the same thing.

## Capabilities

### New Capabilities

- `desktop-release`: a versioned desktop release. Covers the local trigger (version bump,
  changelog, tag, push) and the CI build that turns a tag into a draft GitHub release
  with installers for each desktop platform.

### Modified Capabilities

<!-- none: app-platform describes the running app, not how it is packaged and published -->

## Impact

- New: `.github/workflows/release.yml`, `CHANGELOG.md` (written by the first release).
- `mise.toml`: one tool (`npm:commit-and-tag-version`) and one task (`release`).
- `src-tauri/tauri.conf.json`: `bundle.macOS.signingIdentity`. No other config change;
  `bundle.targets: "all"` already picks deb, rpm, AppImage, dmg, msi, and nsis.
- `package.json` and `package-lock.json` are the only files the version bump touches.
  `src-tauri/Cargo.toml` keeps its own version and is not read by the app or the bundle.
- No app code, IPC, or runtime behaviour changes. Nothing in the pipeline needs a
  secret beyond the default `GITHUB_TOKEN`. Mobile is untouched; the in-flight
  `add-mobile-install-tasks` change owns that path.
