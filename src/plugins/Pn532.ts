/**
 * Minimal PN532 driver over a serial byte stream (HSU / UART mode).
 *
 * Works with the common cheap "PN532 USB" boards (PN532 + CH340/CP2102
 * USB-serial chip). In the browser the stream comes from the Web Serial API
 * (Chrome / Edge on macOS, Windows, Linux), but the driver only needs a
 * `readable` + `writable` pair, so it can also be tested with a fake port.
 *
 * Only the few commands needed for ISO 14443-4 (ISO-DEP / APDU) tags are
 * implemented: wake-up, SAMConfiguration, RFConfiguration,
 * InListPassiveTarget, InDataExchange, InRelease.
 */

export interface ByteStreamPort {
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
}

export class Pn532Error extends Error {}

const HOST_TO_PN532 = 0xd4;
const PN532_TO_HOST = 0xd5;

const CMD_GET_FIRMWARE_VERSION = 0x02;
const CMD_SAM_CONFIGURATION = 0x14;
const CMD_RF_CONFIGURATION = 0x32;
const CMD_IN_DATA_EXCHANGE = 0x40;
const CMD_IN_LIST_PASSIVE_TARGET = 0x4a;
const CMD_IN_RELEASE = 0x52;

const ACK_FRAME = new Uint8Array([0x00, 0x00, 0xff, 0x00, 0xff, 0x00]);

/** Status byte meanings from the PN532 user manual, table 7-1 (subset). */
const STATUS_TEXT: Record<number, string> = {
    0x01: 'timeout, the tag did not answer',
    0x02: 'CRC error',
    0x03: 'parity error',
    0x0a: 'RF field not switched on in time',
    0x0b: 'RF protocol error',
    0x13: 'framing error',
    0x14: 'mifare authentication error',
    0x25: 'tag in wrong state',
    0x27: 'command not acceptable in this context',
    0x29: 'tag was released',
    0x2a: 'card ID does not match',
    0x2b: 'card disappeared',
    0x2e: 'RF field already on (external field)',
};

export type Pn532Target = {
    uid: Uint8Array;
    atqa: number;
    sak: number;
    ats: Uint8Array;
};

/** Build a normal or extended PN532 information frame. */
export function buildFrame(payload: Uint8Array): Uint8Array {
    // payload = command + params, TFI is added here
    const len = payload.length + 1;
    let sum = HOST_TO_PN532;
    for (const b of payload) sum += b;
    const dcs = (0x100 - (sum & 0xff)) & 0xff;

    if (len <= 0xff) {
        const out = new Uint8Array(len + 7);
        out.set([0x00, 0x00, 0xff, len, (0x100 - len) & 0xff, HOST_TO_PN532]);
        out.set(payload, 6);
        out[6 + payload.length] = dcs;
        out[7 + payload.length] = 0x00;
        return out;
    }

    // Extended frame (needed for APDUs > ~252 bytes, e.g. dithr's 255/257 byte image packets)
    const lenM = (len >> 8) & 0xff;
    const lenL = len & 0xff;
    const lcs = (0x100 - ((lenM + lenL) & 0xff)) & 0xff;
    const out = new Uint8Array(len + 10);
    out.set([0x00, 0x00, 0xff, 0xff, 0xff, lenM, lenL, lcs, HOST_TO_PN532]);
    out.set(payload, 9);
    out[9 + payload.length] = dcs;
    out[10 + payload.length] = 0x00;
    return out;
}

function hex(bytes: ArrayLike<number>) {
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(' ');
}

export class Pn532 {
    private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    private rx: number[] = [];
    private rxWaiters: Array<() => void> = [];
    private readLoopDone: Promise<void> | null = null;
    private busy: Promise<unknown> = Promise.resolve();
    public debug = false;

    constructor(private readonly port: ByteStreamPort) {}

    // ---------------------------------------------------------------- I/O

    async open() {
        if (!this.port.readable || !this.port.writable) {
            throw new Pn532Error('Serial port is not open');
        }
        this.writer = this.port.writable.getWriter();
        this.reader = this.port.readable.getReader();
        this.readLoopDone = this.readLoop();

        await this.wakeUp();
        const fw = await this.getFirmwareVersion();
        if (this.debug) console.log('[PN532] firmware', fw);

        // Normal mode, no SAM, use IRQ
        await this.command(CMD_SAM_CONFIGURATION, [0x01, 0x14, 0x01]);
        // MaxRetries: ATR=0xFF, PSL=0x01, passive activation=0x02
        // (so InListPassiveTarget returns quickly and we can poll in a loop)
        await this.command(CMD_RF_CONFIGURATION, [0x05, 0xff, 0x01, 0x02]);
        return fw;
    }

    async close() {
        try { await this.rfOff(); } catch { /* ignore */ }
        try { await this.reader?.cancel(); } catch { /* ignore */ }
        try { this.reader?.releaseLock(); } catch { /* ignore */ }
        try { this.writer?.releaseLock(); } catch { /* ignore */ }
        await this.readLoopDone?.catch(() => {});
        this.reader = null;
        this.writer = null;
    }

    private async readLoop() {
        while (this.reader) {
            let result: ReadableStreamReadResult<Uint8Array>;
            try {
                result = await this.reader.read();
            } catch {
                break;
            }
            if (result.done) break;
            if (result.value) {
                for (const b of result.value) this.rx.push(b);
                const waiters = this.rxWaiters;
                this.rxWaiters = [];
                waiters.forEach(w => w());
            }
        }
    }

    private async write(bytes: Uint8Array) {
        if (!this.writer) throw new Pn532Error('PN532 not opened');
        if (this.debug) console.log('[PN532] >>', hex(bytes));
        await this.writer.write(bytes);
    }

    /** Wait until `n` bytes are buffered (or timeout). */
    private async need(n: number, deadline: number) {
        while (this.rx.length < n) {
            const remaining = deadline - Date.now();
            if (remaining <= 0) throw new Pn532Error('No answer from the NFC writer (timeout)');
            await new Promise<void>(resolve => {
                const t = setTimeout(resolve, remaining);
                this.rxWaiters.push(() => { clearTimeout(t); resolve(); });
            });
        }
    }

    /** Skip garbage until a 00 FF start code. */
    private async syncToStart(deadline: number) {
        for (;;) {
            await this.need(2, deadline);
            if (this.rx[0] === 0x00 && this.rx[1] === 0xff) {
                this.rx.splice(0, 2);
                return;
            }
            this.rx.shift();
        }
    }

    /**
     * Read one frame. Returns null for an ACK, throws on NACK / error frame,
     * otherwise returns the payload after TFI (command code + data).
     */
    private async readFrame(timeoutMs: number): Promise<Uint8Array | null> {
        const deadline = Date.now() + timeoutMs;
        await this.syncToStart(deadline);
        await this.need(2, deadline);
        let len = this.rx[0];
        const lcs = this.rx[1];

        if (len === 0x00 && lcs === 0xff) {
            this.rx.splice(0, 2);
            return null; // ACK
        }
        if (len === 0xff && lcs === 0x00) {
            this.rx.splice(0, 2);
            throw new Pn532Error('NFC writer rejected the frame (NACK)');
        }

        let headerLen = 2;
        if (len === 0xff && lcs === 0xff) {
            // extended frame
            await this.need(5, deadline);
            const lenM = this.rx[2];
            const lenL = this.rx[3];
            if (((lenM + lenL + this.rx[4]) & 0xff) !== 0) {
                this.rx.splice(0, 5);
                throw new Pn532Error('Bad length checksum (extended frame)');
            }
            len = (lenM << 8) | lenL;
            headerLen = 5;
        } else if (((len + lcs) & 0xff) !== 0) {
            this.rx.splice(0, 2);
            throw new Pn532Error('Bad length checksum');
        }

        await this.need(headerLen + len + 2, deadline);
        const body = this.rx.slice(headerLen, headerLen + len);
        const dcs = this.rx[headerLen + len];
        this.rx.splice(0, headerLen + len + 2);

        let sum = dcs;
        for (const b of body) sum += b;
        if ((sum & 0xff) !== 0) throw new Pn532Error('Bad data checksum');

        if (body[0] === 0x7f) throw new Pn532Error('NFC writer reported a syntax error');
        if (body[0] !== PN532_TO_HOST) throw new Pn532Error(`Unexpected frame direction 0x${body[0].toString(16)}`);

        const payload = new Uint8Array(body.slice(1));
        if (this.debug) console.log('[PN532] <<', hex(payload));
        return payload;
    }

    /** Send a command, wait for ACK + response. Commands are serialized. */
    async command(cmd: number, params: ArrayLike<number> = [], timeoutMs = 1000): Promise<Uint8Array> {
        const run = async () => {
            const payload = new Uint8Array(1 + params.length);
            payload[0] = cmd;
            payload.set(Array.from(params), 1);

            this.rx = [];
            await this.write(buildFrame(payload));

            const ack = await this.readFrame(Math.min(timeoutMs, 1000));
            if (ack !== null) throw new Pn532Error('Expected ACK from NFC writer');

            const response = await this.readFrame(timeoutMs);
            if (response === null) throw new Pn532Error('Unexpected second ACK');
            if (response[0] !== cmd + 1) {
                throw new Pn532Error(`Unexpected response 0x${response[0].toString(16)} for command 0x${cmd.toString(16)}`);
            }
            return response.subarray(1);
        };

        const p = this.busy.then(run, run);
        this.busy = p.catch(() => {});
        return p;
    }

    /** Abort a running command (the PN532 aborts when it receives an ACK). */
    async abort() {
        await this.write(ACK_FRAME);
    }

    private async wakeUp() {
        // HSU wake-up: long preamble of 0x55 followed by zeros
        const wake = new Uint8Array(24);
        wake.fill(0x55, 0, 2);
        await this.write(wake);
        await new Promise(r => setTimeout(r, 50));
    }

    // ------------------------------------------------------------ commands

    async getFirmwareVersion() {
        const r = await this.command(CMD_GET_FIRMWARE_VERSION);
        if (r.length < 4) throw new Pn532Error('Bad firmware response');
        return { ic: r[0], version: r[1], revision: r[2], support: r[3], text: `PN5${r[0].toString(16)} v${r[1]}.${r[2]}` };
    }

    async rfOff() {
        await this.command(CMD_RF_CONFIGURATION, [0x01, 0x00]);
    }

    /**
     * Look once for an ISO 14443-A tag. The PN532 automatically sends RATS
     * when the tag says it supports ISO-DEP, so afterwards APDUs can be sent
     * with `exchange()`.
     */
    async findTarget(): Promise<Pn532Target | null> {
        const r = await this.command(CMD_IN_LIST_PASSIVE_TARGET, [0x01, 0x00], 1500);
        if (r[0] === 0) return null;

        // r: NbTg, Tg, SENS_RES(2), SEL_RES, NFCIDLength, NFCID..., [ATSLength, ATS...]
        const atqa = (r[2] << 8) | r[3];
        const sak = r[4];
        const uidLen = r[5];
        const uid = r.slice(6, 6 + uidLen);
        let ats = new Uint8Array(0);
        const atsPos = 6 + uidLen;
        if (atsPos < r.length) {
            const atsLen = r[atsPos];
            ats = r.slice(atsPos + 1, atsPos + atsLen);
        }
        return { uid, atqa, sak, ats };
    }

    /** Send one APDU to the selected tag and return its full answer (incl. SW1 SW2). */
    async exchange(apdu: ArrayLike<number>, timeoutMs = 5000): Promise<Uint8Array> {
        if (apdu.length > 262) throw new Pn532Error(`APDU too long for PN532 (${apdu.length} > 262 bytes)`);
        const params = new Uint8Array(1 + apdu.length);
        params[0] = 0x01; // target number
        params.set(Array.from(apdu), 1);

        const r = await this.command(CMD_IN_DATA_EXCHANGE, params, timeoutMs);
        const status = r[0] & 0x3f;
        if (status !== 0) {
            const text = STATUS_TEXT[status] ?? 'unknown error';
            throw new Pn532Error(`Tag communication failed: ${text} (0x${status.toString(16).padStart(2, '0')})`);
        }
        return r.slice(1);
    }

    async release() {
        await this.command(CMD_IN_RELEASE, [0x00]);
    }
}
