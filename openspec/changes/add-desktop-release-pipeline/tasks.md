## 1. Local release trigger

- [x] 1.1 Add `"npm:commit-and-tag-version"` to `[tools]` in `mise.toml` (pin the current major) and run `mise install` so `commit-and-tag-version --version` works.
- [x] 1.2 Add a `# --- release ---` section to `mise.toml` with a `release` task: bash body that fails unless on `main` and `git status --porcelain` is empty, runs `commit-and-tag-version "$@"`, and runs `git push --follow-tags origin main` unless the arguments contain `--dry-run`.
- [x] 1.3 Run `mise run release -- --dry-run` and confirm it proposes a version from `0.1.0`, prints a changelog section, and leaves the tree clean.

## 2. macOS ad-hoc signing

- [x] 2.1 Add `bundle.macOS.signingIdentity: "-"` to `src-tauri/tauri.conf.json`.
- [ ] 2.2 On the Mac, run `mise run build` and check `codesign -dv` on the produced `.app` reports an ad-hoc signature.

## 3. Release workflow

- [x] 3.1 Create `.github/workflows/release.yml` triggered by `push: tags: ['v*']` and `workflow_dispatch`, with `permissions: contents: write`.
- [x] 3.2 Add the build matrix (`fail-fast: false`): `ubuntu-22.04`, `macos-latest` + `--target aarch64-apple-darwin`, `macos-latest` + `--target x86_64-apple-darwin`, `windows-latest`.
- [x] 3.3 Job steps: `actions/checkout`, `jdx/mise-action` (install node and rust only if the full tool list is slow), `Swatinem/rust-cache` with `workspaces: src-tauri`, apt install of `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf xdg-utils` on Linux only, `npm ci`.
- [x] 3.4 Add a `shell: bash` step that reads the newest section of `CHANGELOG.md` into a multi-line step output (empty string if the file does not exist yet, for manual runs).
- [x] 3.5 Add the `tauri-apps/tauri-action@v1` step with `GITHUB_TOKEN`, `tagName: v__VERSION__`, `releaseName: floppy v__VERSION__`, `releaseBody` from 3.4, `releaseDraft: true`, `prerelease: false`, `args: ${{ matrix.args }}`.
- [x] 3.6 Validate the YAML locally (`actionlint` if available, otherwise a careful read) and commit.

## 4. First release

- [ ] 4.1 `mise run release` for the first tag. Watch all four jobs; if the Linux link step fails, add the missing system lib to the apt list and re-run the job.
- [ ] 4.2 Confirm the draft release has dmg (x2), msi, exe, deb, rpm, and AppImage, that each reports the tagged version, and that the body matches the new `CHANGELOG.md` section.
- [ ] 4.3 Download the Apple Silicon dmg on a Mac, open it, and confirm the unidentified-developer prompt appears instead of a "damaged" error.
- [ ] 4.4 Publish the draft by hand. Add a short "Releasing" note to `README.md` (`mise run release`, dry run and `--release-as` flags, draft is published by hand).
