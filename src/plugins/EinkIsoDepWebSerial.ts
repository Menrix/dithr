/**
 * Browser implementation of the EinkIsoDep plugin.
 *
 * Instead of the phone's NFC chip it talks to a PN532 NFC module connected
 * by USB (it shows up as a serial port). Uses the Web Serial API, which is
 * available in Chrome and Edge (desktop), not in Safari or Firefox.
 *
 * The rest of DITHR does not notice the difference: it still calls
 * startScanning / connect / transceive / close exactly like on Android.
 */
import { WebPlugin } from '@capacitor/core';
import { Pn532, type ByteStreamPort, type Pn532Target } from './Pn532';

// Minimal Web Serial typings (avoid an extra @types dependency)
interface SerialPortLike extends ByteStreamPort {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    getInfo?(): { usbVendorId?: number; usbProductId?: number };
}
interface SerialLike {
    getPorts(): Promise<SerialPortLike[]>;
    requestPort(options?: unknown): Promise<SerialPortLike>;
    addEventListener(type: 'disconnect', cb: (e: Event & { target: unknown }) => void): void;
}

/** USB vendor IDs of the usual USB-serial chips on PN532 boards */
const USB_SERIAL_FILTERS = [
    { usbVendorId: 0x1a86 }, // WCH CH340 / CH341 / CH9102
    { usbVendorId: 0x10c4 }, // Silicon Labs CP210x
    { usbVendorId: 0x0403 }, // FTDI
    { usbVendorId: 0x067b }, // Prolific PL2303
];

const BAUD_RATE = 115200; // PN532 HSU default
const POLL_PAUSE_MS = 150;

export function isWebSerialAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export class EinkIsoDepWebSerial extends WebPlugin {
    private port: SerialPortLike | null = null;
    private pn532: Pn532 | null = null;
    private scanning = false;
    private pollLoop: Promise<void> | null = null;
    private target: Pn532Target | null = null;
    private connected = false;

    /** Firmware text of the attached reader, e.g. "PN532 v1.6" (for the UI) */
    public readerName = '';

    private get serial(): SerialLike {
        if (!isWebSerialAvailable()) {
            throw new Error('This browser has no Web Serial support. Please use Chrome or Edge.');
        }
        return (navigator as unknown as { serial: SerialLike }).serial;
    }

    /**
     * Make sure the PN532 is open. The first time the browser shows a
     * "choose serial port" window (needs a click, which the Sync button is).
     */
    private async ensureReader(): Promise<Pn532> {
        if (this.pn532) return this.pn532;

        const serial = this.serial;
        let port = (await serial.getPorts())[0];
        if (!port) {
            port = await serial.requestPort({ filters: USB_SERIAL_FILTERS });
        }

        await port.open({ baudRate: BAUD_RATE });
        const pn532 = new Pn532(port);
        pn532.debug = localStorage?.getItem?.('dithr.pn532.debug') === '1';
        try {
            const fw = await pn532.open();
            this.readerName = fw.text;
        } catch (e) {
            await pn532.close().catch(() => {});
            await port.close().catch(() => {});
            throw new Error(
                'NFC writer found, but it does not answer. Is the mode switch set to UART/HSU? (' + (e as Error).message + ')',
            );
        }

        serial.addEventListener('disconnect', (e) => {
            if (e.target === this.port) void this.forgetReader();
        });

        this.port = port;
        this.pn532 = pn532;
        return pn532;
    }

    private async forgetReader() {
        this.scanning = false;
        this.connected = false;
        this.target = null;
        const pn532 = this.pn532;
        const port = this.port;
        this.pn532 = null;
        this.port = null;
        await pn532?.close().catch(() => {});
        await port?.close().catch(() => {});
    }

    // ------------------------------------------------------------- plugin API

    async startScanning(): Promise<void> {
        const pn532 = await this.ensureReader();
        if (this.scanning) return;
        this.scanning = true;
        this.target = null;
        this.connected = false;

        this.pollLoop = (async () => {
            while (this.scanning) {
                let found: Pn532Target | null = null;
                try {
                    found = await pn532.findTarget();
                } catch (e) {
                    console.warn('[PN532] poll error', e);
                }

                if (found && this.scanning) {
                    // ISO-DEP tags set bit 0x20 in SAK; E-ink tags need that
                    if (!(found.sak & 0x20)) {
                        console.warn('[PN532] tag found but it is not ISO-DEP, ignoring. SAK=', found.sak);
                    } else {
                        this.target = found;
                        this.connected = true;
                        this.scanning = false; // like Android reader mode: one tag per session
                        this.notifyListeners('onTagReady', { status: 'detected' });
                        return;
                    }
                }
                await new Promise(r => setTimeout(r, POLL_PAUSE_MS));
            }
        })();
    }

    async stopScanning(): Promise<void> {
        this.scanning = false;
        await this.pollLoop?.catch(() => {});
        this.pollLoop = null;
    }

    async connect(_options?: { timeout: number }): Promise<{ connected: boolean }> {
        if (!this.target) {
            throw new Error('No active tag handle found. Did you call startScanning first?');
        }
        return { connected: this.connected };
    }

    async isConnected(): Promise<{ connected: boolean }> {
        // No radio traffic here: DITHR asks this every 100 ms during refresh.
        return { connected: this.connected && !!this.target };
    }

    async transceive(options: { data: number[] }): Promise<{ response: number[] }> {
        if (!this.pn532 || !this.connected) {
            throw new Error('Transceiver channel is closed or dead.');
        }
        try {
            const response = await this.pn532.exchange(options.data, 10000);
            return { response: Array.from(response) };
        } catch (e) {
            this.connected = false;
            throw new Error('Tag disconnected or timed out: ' + (e as Error).message);
        }
    }

    async close(): Promise<{ closed: boolean }> {
        // Closing the dialog also ends a running search
        await this.stopScanning();
        const hadTarget = !!this.target;
        this.target = null;
        this.connected = false;
        if (this.pn532) {
            try {
                if (hadTarget) await this.pn532.release();
                await this.pn532.rfOff();
            } catch { /* ignore */ }
        }
        // The serial port stays open so the next sync needs no port dialog.
        return { closed: true };
    }
}
