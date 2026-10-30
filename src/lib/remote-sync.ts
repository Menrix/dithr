/**
 * "Send via Mac": a phone without NFC access sends the finished image over the
 * local network to a DITHR tab on the Mac (the "station"), which writes it to the
 * badge with the USB NFC writer and reports progress back to the phone.
 *
 * Transport: the dev server's existing live connection (Vite HMR websocket),
 * relayed by the `dithr-phone-relay` plugin in vite.config.ts. So this only works
 * while DITHR runs with `pnpm dev` / the DITHR Mac app.
 */
import { SyncStep } from '$lib/shared';
import { DEVICES } from '$lib/devices';
import { NfcFmscEinkDevice } from '$lib/devices/NfcFmscEinkDevice';
import { NfcEinkDevice } from '$lib/devices/NfcEinkDevice';
import { EinkIsoDep } from '../plugins/EinkIsoDep';

export const REMOTE_AVAILABLE = !!import.meta.hot;

export type RemoteSyncRequest = {
    id: string;
    deviceId: string;
    width: number;
    height: number;
    /** RGBA pixels, base64 */
    rgba: string;
};

export type RemoteProgress =
    | { id: string; type: 'waiting' }
    | { id: string; type: 'step'; step: SyncStep }
    | { id: string; type: 'transfer'; currentScreen: number; totalScreens: number; currentPacket: number; totalPackets: number }
    | { id: string; type: 'refresh'; remaining: number }
    | { id: string; type: 'error'; message: string }
    | { id: string; type: 'done' };

type ProgressBody = RemoteProgress extends infer T ? (T extends RemoteProgress ? Omit<T, 'id'> : never) : never;

// ------------------------------------------------------------------ helpers

function toBase64(bytes: Uint8ClampedArray): string {
    let s = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(s);
}

function fromBase64(b64: string): Uint8ClampedArray<ArrayBuffer> {
    const s = atob(b64);
    const out = new Uint8ClampedArray(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
}

// --------------------------------------------------------------- phone side

/**
 * Send the image to the Mac station. Resolves when the badge is done,
 * rejects with a readable message on error.
 */
export function sendToStation(deviceId: string, imageData: ImageData, handler: SyncProgressHandler, onWaiting: () => void): Promise<void> {
    const hot = import.meta.hot;
    if (!hot) return Promise.reject(new Error('Sending via Mac only works while DITHR runs on the Mac'));

    const id = Math.random().toString(36).slice(2);
    const req: RemoteSyncRequest = {
        id,
        deviceId,
        width: imageData.width,
        height: imageData.height,
        rgba: toBase64(imageData.data),
    };

    return new Promise<void>((resolve, reject) => {
        let answered = false;
        const noAnswer = setTimeout(() => {
            if (!answered) finish(new Error('The Mac does not answer. Is DITHR open in Chrome on the Mac?'));
        }, 8000);

        const listener = (msg: RemoteProgress) => {
            if (msg.id !== id) return;
            answered = true;
            switch (msg.type) {
                case 'waiting': onWaiting(); break;
                case 'step': handler.switchStep(msg.step); break;
                case 'transfer': handler.onTransferProgress(msg.currentScreen, msg.totalScreens, msg.currentPacket, msg.totalPackets); break;
                case 'refresh': handler.onRefreshCountdown(msg.remaining); break;
                case 'error': finish(new Error(msg.message)); break;
                case 'done': finish(); break;
            }
        };

        function finish(error?: Error) {
            clearTimeout(noAnswer);
            hot!.off?.('dithr:remote-progress', listener);
            if (error) reject(error); else resolve();
        }

        hot.on('dithr:remote-progress', listener);
        hot.send('dithr:remote-sync', req);
    });
}

// ----------------------------------------------------------------- Mac side

export type StationStatus = 'off' | 'ready' | 'waiting' | 'busy';

let stationBusy = false;

/**
 * Turn this tab into the station (Mac with Web Serial). Calls `onStatus` so
 * the UI can show what is going on.
 */
export function startStation(onStatus: (status: StationStatus, text?: string) => void) {
    const hot = import.meta.hot;
    if (!hot) return () => {};

    const hello = () => hot.send('dithr:station-hello', {});
    hello();
    const helloTimer = setInterval(hello, 4000);
    onStatus('ready');

    const listener = async (req: RemoteSyncRequest) => {
        const report = (p: ProgressBody) => hot.send('dithr:remote-progress', { ...p, id: req.id });

        if (stationBusy) {
            report({ type: 'error', message: 'The Mac is busy with another image, try again in a moment' });
            return;
        }
        stationBusy = true;

        let tagHandle = null as { remove(): Promise<void> } | null;
        let tagTimeout: ReturnType<typeof setTimeout> | undefined;

        try {
            const info = DEVICES[req.deviceId];
            if (!info || req.deviceId === 'custom') throw new Error('This device is not supported via Mac');
            const device = new info.class(info);
            if (!(device instanceof NfcEinkDevice)) throw new Error('This device has no NFC sync');

            const imageData = new ImageData(fromBase64(req.rgba), req.width, req.height);

            await EinkIsoDep.stopScanning().catch(() => {});
            try {
                await EinkIsoDep.startScanning();
            } catch (e) {
                throw new Error('NFC writer on the Mac is not ready. Press SYNC once on the Mac to allow the writer. (' + (e as Error).message + ')');
            }

            onStatus('waiting', 'Waiting for the badge on the writer…');
            report({ type: 'waiting' });

            await new Promise<void>((resolve, reject) => {
                tagTimeout = setTimeout(() => reject(new Error('No badge found on the writer (60 s)')), 60_000);

                EinkIsoDep.addListener('onTagReady', async () => {
                    clearTimeout(tagTimeout);
                    onStatus('busy', 'Sending image…');
                    try {
                        await EinkIsoDep.connect({ timeout: 10000 });
                        const hardwareConfig = device instanceof NfcFmscEinkDevice ? await NfcFmscEinkDevice.getHardwareConfig() : undefined;

                        const handler: SyncProgressHandler = {
                            onTransferProgress: (currentScreen, totalScreens, currentPacket, totalPackets) =>
                                report({ type: 'transfer', currentScreen, totalScreens, currentPacket, totalPackets }),
                            onRefreshCountdown: (remaining) => report({ type: 'refresh', remaining }),
                            onError: () => {},
                            switchStep: (step) => report({ type: 'step', step }),
                        };
                        await device.syncImage(hardwareConfig as EinkHardwareConfig, imageData, handler);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }).then(h => { tagHandle = h; });
            });

            report({ type: 'done' });
        } catch (e) {
            report({ type: 'error', message: (e as Error).message ?? String(e) });
        } finally {
            clearTimeout(tagTimeout);
            await tagHandle?.remove().catch(() => {});
            await EinkIsoDep.close().catch(() => {});
            await EinkIsoDep.stopScanning().catch(() => {});
            stationBusy = false;
            onStatus('ready');
        }
    };

    hot.on('dithr:remote-sync', listener);

    return () => {
        clearInterval(helloTimer);
        hot.off?.('dithr:remote-sync', listener);
        onStatus('off');
    };
}
