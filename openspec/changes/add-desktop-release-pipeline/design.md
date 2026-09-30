## Context

The repo has no `.github/` directory, no tags, and version `0.1.0` in `package.json`.
`tauri.conf.json` reads its `version` from `../package.json`, so one bump drives the
bundle version. `bundle.targets` is `"all"`, which on each OS yields: Linux deb + rpm +
AppImage, Windows msi + nsis, macOS .app + dmg. Nothing is signed. `mise.toml` pins
node 26.5.0 and rust 1.98 and installs openspec as an `npm:` tool. The broker URL has a
compile-time fallback to the hosted broker in `lib.rs`, so a CI build needs no env.
Commits already follow conventional commits.

## Goals / Non-Goals

**Goals:**

- `mise run release` on a clean `main` produces a new version, a changelog entry, a tag,
  and a push. Nothing else to remember.
- A `v*` tag produces a draft GitHub release with installers for macOS (arm and intel),
  Windows, and Linux, built with the same toolchain pins as the laptop.
- Release notes and `CHANGELOG.md` are the same text.
- A macOS build that was never notarised still opens.

**Non-Goals:**

- Apple notarisation, Windows code signing, the Tauri updater plugin and its keys.
- Linux ARM builds (the free ARM runner needs a public repo; revisit when there is a
  device to serve).
- Mobile builds or store uploads.
- Running tests in CI. The release workflow builds and uploads only; a CI test gate is a
  separate change.

## Decisions

### D1: `tauri-apps/tauri-action@v1` with the documented four-way matrix

The action wraps `tauri build`, finds or creates the release by tag, and uploads every
bundle. The matrix is the one from the Tauri distribution guide: `ubuntu-22.04`,
`macos-latest` twice (`--target aarch64-apple-darwin`, `--target x86_64-apple-darwin`),
`windows-latest`. Linux apt deps: `libwebkit2gtk-4.1-dev libappindicator3-dev
librsvg2-dev patchelf xdg-utils`.

Alternative: a hand-rolled `tauri build` + `softprops/action-gh-release`. More YAML, no
gain at this size.

Alternative: one universal macOS binary (`--target universal-apple-darwin`). Doubles the
mac build time on one runner and needs both rustup targets installed; two jobs is
simpler and parallel.

### D2: Toolchain from `jdx/mise-action`, plus `Swatinem/rust-cache`

`mise-action` reads `mise.toml`, so CI compiles with the same node and rust the laptop
uses and there is one place to bump a pin. `rust-cache` is added because iroh and
iroh-blobs are a heavy tree; a cold macOS compile is likely 10 to 20 minutes and the
cache cuts repeat runs substantially.

Alternative: `actions/setup-node` + `dtolnay/rust-toolchain`. Rejected because the pins
would be duplicated and drift.

Note: `mise.toml` also lists `java`, `ruby`, `cocoapods`, and `go`. `java`, `ruby`, and
`cocoapods` are already OS-gated. If `mise install` in CI turns out to be slow because of
tools the release job does not need, the fix is `mise install node rust` (install only
named tools), not more actions.

### D3: Draft release, tag name `v__VERSION__`, name `floppy v__VERSION__`

The draft lets a person look at the assets and the notes before anyone can download.
`commit-and-tag-version` tags `v<version>` by default, so `tagName: v__VERSION__`
matches without config on either side.

### D4: `commit-and-tag-version` as a mise tool, not a devDependency

It is the maintained fork of `standard-version` and does exactly one release step: read
commits since the last tag, pick the bump, update `package.json` and
`package-lock.json`, prepend a `CHANGELOG.md` section, commit `chore(release): x.y.z`,
tag. Installing it as `"npm:commit-and-tag-version"` in `[tools]` matches how openspec is
installed and keeps it out of `node_modules` and the app's dependency tree.

Alternatives: `release-please` (a bot-driven PR flow; the user asked for a local trigger),
`git-cliff` (changelog only, no bump or tag), a hand-written bump script (reinvents the
tool).

### D5: `src-tauri/Cargo.toml` is not bumped

The app reads `CARGO_PKG_VERSION` nowhere, and Tauri takes the bundle version from
`package.json` via `tauri.conf.json`. Bumping `Cargo.toml` would need a custom updater
(there is no built-in Cargo one) and would leave `Cargo.lock` stale until the next build,
which then dirties the tree right after a release commit. The Cargo version stays at
`0.1.0` and means nothing. If it ever starts to matter, add an updater then.

### D6: Release body is the newest `CHANGELOG.md` section

A bash step (`shell: bash`, so it also runs on the Windows runner) prints everything
from the first `## ` or `### ` heading down to the next one and hands it to
`releaseBody` through a multi-line step output. Every matrix job computes the same text;
the action finds the release by tag after the first job creates it, so the body is set
once and the rest only upload. GitHub's `generateReleaseNotes` is not used because it
would say something different from the changelog.

### D7: The `release` task is a short bash script with a preflight

Preflight: on `main`, working tree clean. Then `commit-and-tag-version "$@"` so
`mise run release -- --dry-run` and `mise run release -- --release-as minor` pass
through unchanged, then `git push --follow-tags origin main`. The dry run must not
push, so the push is skipped when the arguments contain `--dry-run`. No
`.versionrc.json` unless the default changelog header or section types need changing.

Alternative: run `mise run verify` first. Left out of the task on purpose: it is slow and
the person releasing can run it by hand. Easy to add later.

### D8: macOS ad-hoc signing

`bundle.macOS.signingIdentity: "-"` makes `tauri build` sign the app with the ad-hoc
identity. Without it Gatekeeper on Apple Silicon reports the download as damaged and
there is no dialog to click through. Ad-hoc signed apps still show the "unidentified
developer" prompt, which is the expected state without a paid account. No effect on
local `mise run build` other than the same ad-hoc signature.

## Risks / Trade-offs

- [First Linux link step fails on a missing system lib] → the deep-link and
  single-instance plugins are the usual suspects. The documented apt list covers them
  in practice; if not, add the lib the linker names and note it in the workflow.
- [`mise install` in CI pulls tools the job does not need] → restrict to `node rust`
  (see D2).
- [Cold macOS build near the free-minutes ceiling] → `rust-cache` on every job, and
  the two mac targets are separate jobs so neither is serial.
- [A release job fails after the draft release exists] → re-run the failed job; the
  action finds the release by tag and uploads the missing assets. Nothing is published
  until the draft is.
- [mise postinstall hooks run without a POSIX shell on Windows] → the rust hook is
  `rustup default 1.98` with the version written out; `$RUSTUP_TOOLCHAIN` and mise
  templates both reach rustup unexpanded there. Found on the first Windows job.
- [Windows SmartScreen warning on the nsis and msi installers] → accepted; needs a
  code-signing certificate, which is out of scope.
- [The first `commit-and-tag-version` run has no previous tag] → it reads the whole
  history and proposes a bump from `0.1.0`; use `--release-as` if the automatic pick is
  wrong, and `--dry-run` first.

## Migration Plan

1. Land the workflow, the mise task, the tool, and the `tauri.conf.json` line.
2. `mise run release -- --dry-run` to see the proposed version and changelog.
3. `mise run release` for the first tag. Watch the four jobs.
4. Check the draft release assets and notes, then publish it by hand.

Rollback: delete the draft release and the tag, revert the release commit. Nothing
outside git and the GitHub release is touched.

## Open Questions

- None blocking. Whether the repo is public decides if a Linux ARM job is free later.
