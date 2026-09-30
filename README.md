ToDos:

- Remove or improve the scroll into view thing when focusing text inputs, feels buggy atm
- Toaster needs to respect titlebar height, currently clips with trafic lights on macos small screen desktop
- wordign improvements
- error on qrreader loop
- somehow make file loading of images faster
- mobile native notifications. (most likely not since this would introduce statefull broker)
- deeper integration in system share menus

Releasing:

- `mise run release` on a clean `main` bumps the version from the commits, writes `CHANGELOG.md`, tags, and pushes. GitHub Actions then builds the desktop installers into a draft release. Publish the draft by hand.
- `mise run release -- --dry-run` previews the version and notes. `mise run release -- --release-as minor` forces the bump size.
