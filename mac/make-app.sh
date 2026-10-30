#!/bin/bash
# Builds DITHR.app (a real macOS app) in the dithr folder.
# Run once in Terminal:  bash <path-to-dithr>/mac/make-app.sh
set -e
MAC_DIR="$(cd "$(dirname "$0")" && pwd)"
DITHR_DIR="$(dirname "$MAC_DIR")"
APP="$DITHR_DIR/DITHR.app"

rm -rf "$APP"
# AppleScript applet: starts the launcher script in the background and quits
osacompile -o "$APP" -e 'do shell script quoted form of (POSIX path of (path to me) & "Contents/Resources/start.sh") & " > /dev/null 2>&1 &"'
cp "$MAC_DIR/start.sh" "$APP/Contents/Resources/start.sh"
chmod +x "$APP/Contents/Resources/start.sh"
cp "$MAC_DIR/dithr.icns" "$APP/Contents/Resources/applet.icns"
rm -f "$APP/Contents/Resources/Assets.car"
/usr/libexec/PlistBuddy -c "Delete :CFBundleIconName" "$APP/Contents/Info.plist" 2>/dev/null || true
codesign --force --deep -s - "$APP" >/dev/null 2>&1
touch "$APP"
echo "DITHR.app created in: $DITHR_DIR"
