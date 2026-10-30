#!/bin/bash
# DITHR launcher for macOS: starts the DITHR server in the background (if needed)
# and opens it in Chrome. The server stops by itself when no DITHR tab is open anymore.

# On Apple Silicon (M1 ...) never run through Rosetta (Intel mode), otherwise the
# installed native packages don't match
if [ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" = "1" ]; then
  exec arch -arm64 /bin/bash "$0" "$@"
fi
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
URL="http://localhost:5173/app/"
CONF="$HOME/Library/Application Support/DITHR"
LOG="$HOME/Library/Logs/dithr.log"
mkdir -p "$CONF" "$HOME/Library/Logs"

# Dialogs via System Events, so they always come to the front (this app has no own window)
msg() { osascript -e "tell application \"System Events\" to display dialog \"$1\" with title \"DITHR\" buttons {\"OK\"} default button 1 with icon caution giving up after 60" >/dev/null 2>&1; }
notify() { osascript -e "display notification \"$1\" with title \"$2\"" >/dev/null 2>&1; }

isdithr() { [ -f "$1/package.json" ] && grep -q '"name": "dithr"' "$1/package.json"; }

# Find the dithr folder: first next to the app, otherwise the remembered path
APP_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
for D in "$APP_DIR" "$(dirname "$APP_DIR")"; do
  if isdithr "$D"; then
    DITHR="$D"
    echo "$DITHR" > "$CONF/folder"
    break
  fi
done
if [ -z "$DITHR" ] && [ -f "$CONF/folder" ]; then
  DITHR="$(cat "$CONF/folder")"
fi

if [ -z "$DITHR" ] || ! isdithr "$DITHR"; then
  # Not found (e.g. macOS started the app from a hidden location): ask once
  DITHR="$(osascript -e 'tell application "System Events"' -e 'activate' -e 'POSIX path of (choose folder with prompt "Please select your dithr folder (only needed once):")' -e 'end tell' 2>/dev/null)"
  DITHR="${DITHR%/}"
  [ -z "$DITHR" ] && exit 0
  if ! isdithr "$DITHR"; then
    msg "This folder does not contain DITHR. Please select the folder that contains DITHR's package.json."
    exit 1
  fi
  echo "$DITHR" > "$CONF/folder"
fi

if ! command -v pnpm >/dev/null 2>&1; then
  msg "pnpm is missing. Please run this once in Terminal: sudo npm install -g pnpm"
  exit 1
fi

running() { curl -s -o /dev/null --max-time 1 "$URL"; }

if ! running; then
  cd "$DITHR" || exit 1
  if [ ! -d node_modules ]; then
    notify "First start: downloading packages (1-2 minutes) ..." "DITHR"
    pnpm install >"$LOG" 2>&1 || { msg "Installation failed. Details: ~/Library/Logs/dithr.log"; exit 1; }
  fi
  DITHR_AUTO_EXIT=1 nohup pnpm dev >>"$LOG" 2>&1 &
  echo $! > "$CONF/pid"
  disown
  for i in $(seq 1 60); do running && break; sleep 0.5; done
  if ! running; then
    msg "DITHR does not start. Details: ~/Library/Logs/dithr.log"
    exit 1
  fi
fi

# Open in Chrome (Web Serial for the USB NFC writer needs Chrome or Edge)
if open -Ra "Google Chrome" 2>/dev/null; then
  open -a "Google Chrome" "$URL"
elif open -Ra "Microsoft Edge" 2>/dev/null; then
  open -a "Microsoft Edge" "$URL"
else
  open "$URL"
  msg "Chrome not found. Please install Google Chrome to use the USB NFC writer."
fi

# Show the address for the phone (same Wi-Fi). The .local name stays the same on every network.
HOSTNAME_LOCAL="$(scutil --get LocalHostName 2>/dev/null)"
if [ -n "$HOSTNAME_LOCAL" ]; then
  notify "On your phone: http://$HOSTNAME_LOCAL.local:5173/app/" "DITHR is running"
else
  IP="$(ipconfig getifaddr en0 2>/dev/null)"
  [ -n "$IP" ] && notify "On your phone: http://$IP:5173/app/" "DITHR is running"
fi
exit 0
