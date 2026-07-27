#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

APP_NAME="floppy"
BIN_DIR="${XDG_BIN_HOME:-$HOME/.local/bin}"
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}"
DESKTOP_DIR="$DATA_DIR/applications"
ICON_DIR="$DATA_DIR/icons/hicolor/256x256/apps"

TARGET="$BIN_DIR/$APP_NAME"
DESKTOP_FILE="$DESKTOP_DIR/$APP_NAME.desktop"
ICON_FILE="$ICON_DIR/$APP_NAME.png"

echo "Building..."
wails3 build

SOURCE="./bin/$APP_NAME"
[ -x "$SOURCE" ] || { echo "Build produced no $SOURCE" >&2; exit 1; }

# Remove the previous install before laying down the new one, so a renamed or
# dropped file from an older version cannot linger.
for old in "$TARGET" "$DESKTOP_FILE" "$ICON_FILE"; do
  if [ -e "$old" ]; then
    echo "Removing previous install at $old"
    rm -f "$old"
  fi
done

mkdir -p "$BIN_DIR" "$DESKTOP_DIR" "$ICON_DIR"
install -m 755 "$SOURCE" "$TARGET"
install -m 644 ./build/appicon.png "$ICON_FILE"

# Written here rather than reusing build/linux/floppy.desktop: that one has a
# bare `Exec=floppy`, which only works if $BIN_DIR is on PATH.
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Floppy
Comment=Send and receive files device to device
Exec=$TARGET
Icon=$APP_NAME
Categories=Utility;FileTransfer;
Terminal=false
EOF
chmod 644 "$DESKTOP_FILE"

command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$DESKTOP_DIR" || true
command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -f -t "$DATA_DIR/icons/hicolor" || true

echo
echo "Installed:"
echo "  $TARGET"
echo "Desktop entry:"
echo "  $DESKTOP_FILE"
echo

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "Note: $BIN_DIR is not on your PATH — add it to run '$APP_NAME' from a shell."; echo ;;
esac

echo "You can now search for '$APP_NAME' in your application launcher."
