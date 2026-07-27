#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

APP_NAME="Floppy"          # what the app is called once installed
EXEC_NAME="floppy"         # CFBundleExecutable, and what the build task names things
INSTALL_DIR="$HOME/Applications"
TARGET="$INSTALL_DIR/$APP_NAME.app"

# `package`, not `build`: build only emits the bare binary, and Finder,
# Spotlight and Launchpad only see .app bundles.
echo "Building..."
wails3 package

SOURCE="./bin/$EXEC_NAME.app"
[ -d "$SOURCE" ] || { echo "Build produced no $SOURCE" >&2; exit 1; }

# Always start from a clean slate: copying over a bundle leaves resources from
# the previous version behind (stale icons, dropped files).
if [ -d "$TARGET" ]; then
  echo "Removing previous install at $TARGET"
  pkill -f "$TARGET/Contents/MacOS/$EXEC_NAME" 2>/dev/null || true
  rm -rf "$TARGET"
fi

mkdir -p "$INSTALL_DIR"
cp -R "$SOURCE" "$TARGET"

# Nudge Launch Services so Spotlight/Launchpad pick up the new bundle instead
# of a cached entry for the one we just deleted.
LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
[ -x "$LSREGISTER" ] && "$LSREGISTER" -f "$TARGET" || true

echo
echo "Installed:"
echo "  $TARGET"
echo
echo "You can now search for '$APP_NAME' from Spotlight."
