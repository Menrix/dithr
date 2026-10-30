# DITHR with a USB NFC writer (PN532) on the Mac

This fork adds three things to the DITHR web version:

1. **Sync via USB NFC writer** – send images to NFC e-ink displays (e.g. the
   Good Display 3.6" Spectra 6 badge) from Chrome/Edge on a computer, using a
   PN532 NFC module connected by USB.
2. **Send from iPhone via Mac** – an iPhone (which can't use NFC from a web page)
   sends the finished image over Wi-Fi to the Mac, which writes it with the USB writer.
3. **Touch improvements** – pinch to scale and twist to rotate with two fingers,
   bigger corner handles on touch screens, and working "Add" menus on iOS Safari.

The Android app works as before.

> ⚠️ The USB writer part has been tested against a simulated PN532 only so far.

## 1. Prepare the NFC writer

- Set the mode switches on the PN532 board to **UART** (also called **HSU**).
  On most boards: both switches **OFF / 0** (see the print on the board).
- Connect it to the computer by USB. macOS usually needs no driver.

Boards with a built-in USB-serial chip (CH340, CP210x, FTDI, PL2303) are supported.

## 2. Run DITHR on the Mac

One-time setup:

1. Install Node.js (LTS): https://nodejs.org
2. In Terminal:
   ```
   sudo npm install -g pnpm
   ```
3. In Terminal, go to the dithr folder (type `cd `, drag the folder into the
   window, press Enter) and run:
   ```
   pnpm install
   pnpm dev
   ```
4. Open **Chrome**: http://localhost:5173/app/
   (Safari can't talk to USB serial devices.)

### Optional: DITHR as a Mac app

Run once in Terminal (adjust the path, or type `bash ` and drag
`mac/make-app.sh` into the window):
```
bash /path/to/dithr/mac/make-app.sh
```
This creates **DITHR.app** in the dithr folder. Double-clicking it starts DITHR
in the background and opens Chrome. When you close the DITHR tab, DITHR stops
by itself after about 20 seconds. You can drag the app into the Dock.

## 3. Send an image

1. Select your device (e.g. "Good Display 3.6" Badge"), set up the image,
   switch to **Dither**.
2. Click **SYNC**. The first time, Chrome asks which device it may use –
   choose the entry with "USB Serial" / "CH340".
3. Place the display flat on the writer and **leave it there** until
   "Finished!" appears (including the screen refresh, about 15 seconds).

## 4. Send from iPhone via the Mac

1. Start DITHR on the Mac. Bottom left shows "📡 Mac station ready".
   The very first time, click **SYNC** once on the Mac and pick the writer,
   so Chrome is allowed to use it.
2. On the iPhone (same Wi-Fi, or the Mac connected to the iPhone's hotspot),
   open in Safari:
   ```
   http://<your-mac-name>.local:5173/app/
   ```
   The Mac name is in System Settings → General → Sharing → "Local hostname".
   The DITHR app also shows the address in a notification when it starts.
   Tip: Share → "Add to Home Screen" for a one-tap icon.
3. Set up the image, tap **SYNC**, place the display on the writer at the Mac.
   Progress is shown on the iPhone.

If macOS asks whether "node" may accept incoming connections, click **Allow**.
Public/guest Wi-Fi networks often block devices from seeing each other.

## Troubleshooting

- **"does not answer"**: the board's mode switch is not set to UART/HSU.
- **"No Mac station found"** (on the phone): open DITHR in **Chrome** on the Mac
  (Safari on the Mac can't be the station).
- **Detailed log**: in Chrome open the console (`Alt+Cmd+J`), enter
  `localStorage.setItem('dithr.pn532.debug','1')`, reload, sync again.
  Every data packet is then logged.
- **Mac app log**: `~/Library/Logs/dithr.log`

## What was changed

- `src/plugins/Pn532.ts` – talks to the PN532 chip over serial (new)
- `src/plugins/EinkIsoDepWebSerial.ts` – browser replacement for the phone's NFC (new)
- `src/plugins/EinkIsoDep.ts` – uses the USB writer in the browser
- `src/lib/remote-sync.ts` – sending from the phone via the Mac (new)
- `src/lib/editor/TouchGestures.ts` – two-finger scale/rotate, bigger handles (new)
- `src/lib/components/App.svelte` – SYNC button in the browser, Mac station
- `src/lib/components/dialogs/SyncNfcDialog.svelte` – USB writer / phone texts
- `src/lib/components/canvases/EditorCanvas.svelte` – touch gestures, handle size at every zoom
- `src/lib/components/panels/LayersPanel.svelte` – "Add" menus work on iOS Safari
- `vite.config.ts` – works without a .git folder, auto-stop, phone relay, `.local` addresses
- `mac/` – Mac app: launcher script, icon, build script (new)
