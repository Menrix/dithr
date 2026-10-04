import { encodeImage } from "$lib/image-encoder";
import { SyncStep } from "$lib/shared";
import { bytesToHex, hexStringToBytes, sleep } from "$lib/utils";
import { EinkIsoDep } from "../../plugins/EinkIsoDep";
import { EinkDevice } from "./EinkDevice";
import { lzo1xCompress } from 'lzo1x';
import { NfcEinkDevice } from "./NfcEinkDevice";

// Known SW1 leading bytes from Appendix A, used to strip a trailing status word if present.
const KNOWN_SW1 = new Set([0x90, 0x62, 0x64, 0x65, 0x67, 0x68, 0x69, 0x6a, 0x6c]);

const MANUFACTURER_NAMES: Record<number, string> = {
    0x00: 'JIAXIAN', 0x10: 'YUANTAI', 0x20: 'AOYI', 0x30: 'WEIFENG',
    0x40: 'PDI', 0x60: 'JDF', 0x70: 'DKE', 0x80: 'WEIXINNUO', 0xf0: 'OTHER',
};

const DRIVER_NAMES: Record<number, string> = {
    0x00: 'DRIVER_00', 0x10: 'DRIVER_10', 0x20: 'DRIVER_20', 0x30: 'DRIVER_30',
    0x40: 'DRIVER_40', 0x60: 'DRIVER_60', 0x70: 'DRIVER_70', 0x80: 'DRIVER_80',
    0xf0: 'CUSTOM_DRIVER',
};

const COLOR_MAP: Record<number, PaletteId> = {
    0x20: 'bw', 0x30: 'bwr', 0x31: 'bwry',
};

const CHANNEL_3BIT: Record<number, EinkColorChannel> = {
    0: 'black', 1: 'white', 2: 'red', 3: 'yellow',
};

const CHANNEL_EXTENDED: Record<number, EinkColorChannel> = {
    0: 'black', 1: 'white', 2: 'red', 3: 'yellow',
    4: 'orange', 5: 'green', 6: 'cyan', 7: 'blue', 8: 'violet',
};


export class NfcFmscEinkDevice extends NfcEinkDevice {
    private static readonly CONFIG_INFO_CMD = hexStringToBytes('00D10000');
    private readonly BUSY_STATUS_CMD = hexStringToBytes('F0DE000001');

    constructor(
        public readonly deviceInfo: NfcFmscEinkDeviceInfo,
    ) {
        super(deviceInfo);
    }

    protected override async isScreenBusy(): Promise<boolean> {
        if (!(await EinkIsoDep.isConnected()).connected) {
            return false;
        }

        const response = await EinkIsoDep.transceive({ data: Array.from(this.BUSY_STATUS_CMD) });
        try {
            // 0x01: busy
            // 0x00: idle (refresh completed)
            return response.response[0] === 0x01;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    private static parseScreenInfo(v: Uint8Array): EinkScreenTypeInfo {
        if (v.length !== 7) {
            throw new Error(`TAG A0 expects 7 bytes, got ${v.length}`);
        }

        const manufacturerByte = v[0];
        const manufacturer = `${MANUFACTURER_NAMES[manufacturerByte] ?? 'OTHER'}(${manufacturerByte.toString(16).padStart(2, '0')})`.toUpperCase();

        // const flipHorizontal = ((v[1] >> 7) & 1) === 1;
        // const flipVertical = ((v[1] >> 6) & 1) === 1;

        const colorByte = v[2];
        let color: PaletteId = 'bw';
        if (colorByte in COLOR_MAP) {
            color = COLOR_MAP[colorByte];
        } else {
            const n = colorByte >> 4;
            if (n === 6) {
                color = 'spectra-6';
            }
        }

        const height = (v[3] << 8) | v[4];
        const width = (v[5] << 8) | v[6];

        return {
            manufacturer,
            color,
            width,
            height,
            // flipHorizontal,
            // flipVertical,
        };
    }

    private static decodeChannels(bytes: Uint8Array, colorCount: number, channelMap: Record<number, EinkColorChannel>): EinkColorChannelEntry[] {
        const shift = (3 - colorCount) + 3;
        const mask = colorCount === 2 ? 1 : 3;
        const out: EinkColorChannelEntry[] = [];
        for (let i = 0; i < colorCount; i++) {
            const entry = bytes[i];
            const type = (entry >> 5) & 0x07;
            const value = shift >= 0 ? (entry >> shift) & mask : entry & mask;
            const channel = channelMap[type];
            if (channel) out.push({ channel, value });
        }
        return out;
    }

    private static parseColorInfo(v: Uint8Array): EinkColorInfo {
        if (v.length < 1) {
            throw new Error('TAG A1 requires at least 1 byte');
        }

        const scanMode = v[0] === 0x01 ? 'HORIZONTAL' : 'VERTICAL';

        const size = (v[1] >> 4) & 0x0f;
        const colorCount = v[1] & 0x0f;
        const channels = NfcFmscEinkDevice.decodeChannels(v.slice(2), colorCount, CHANNEL_3BIT);

        return { scanMode, colorControl: { size, colorCount, channels } };
    }

    private static parseExtendedColor(v: Uint8Array): EinkExtendedColorInfo {
        const size = (v[0] >> 4) & 0x0f;
        const colorCount = v[0] & 0x0f;
        const pairs: EinkColorChannelEntry[] = [];
        for (let i = 0; i < colorCount; i++) {
            const type = v[2 + i * 2];
            const value = v[3 + i * 2];
            const channel = CHANNEL_EXTENDED[type];
            if (channel) {
                pairs.push({ channel, value });
            }
        }
        return { size, colorCount, channels: pairs, deviceType: 6 };
    }

    public static async getHardwareConfig(): Promise<EinkHardwareConfig> {
        const response = await EinkIsoDep.transceive({ data: Array.from(NfcFmscEinkDevice.CONFIG_INFO_CMD) });
        let bytes = new Uint8Array(response.response);

        if (bytes.length >= 2 && KNOWN_SW1.has(bytes[bytes.length - 2])) {
            bytes = bytes.slice(0, -2);
        }

        const raw: Record<string, Uint8Array> = {};
        const config: EinkHardwareConfig = { raw };

        let i = 0;
        while (i < bytes.length) {
            if (i + 2 > bytes.length) throw new Error(`Truncated TLV at offset ${i}`);
            const tag = bytes[i];
            const len = bytes[i + 1];
            const start = i + 2;
            const end = start + len;
            if (end > bytes.length) {
                throw new Error(`TLV overruns buffer at offset ${i} (tag=0x${tag.toString(16)}, len=${len})`);
            }
            const value = bytes.slice(start, end);
            raw[`0x${tag.toString(16).toUpperCase()}`] = value;

            switch (tag) {
                case 0xa0: config.screenType = NfcFmscEinkDevice.parseScreenInfo(value); break;
                case 0xa1: config.colorInfo = NfcFmscEinkDevice.parseColorInfo(value); break;
                case 0xb1: config.imageCapacity = value[0]; break;
                case 0xb2: config.userDataCapacityKB = value[0]; break;
                case 0xb3: config.hasBattery = value[0] !== 0x00; break;
                case 0xc0: config.appId = bytesToHex(value); break;
                case 0xc1: config.uid = bytesToHex(value); break;
                case 0xd1:
                    // RFU
                    config.compressionSupported = value[0] !== 0x00;
                    config.systemVersionRaw = value[1];
                    config.cosVersion2 = value[1] === 0x20;
                    break;
                case 0xe0: config.extendedColor = NfcFmscEinkDevice.parseExtendedColor(value); break;
                default: break;
            }

            i = end;
        }

        return config;
    }

    protected async compressAndSend(bytes: Uint8Array, screenIndex: number, totalScreens: number, progressHandler: SyncProgressHandler) {
        const totalBytes: number = bytes.length;
        const packetPayloadSize = 2000;
        const totalPackets: number = Math.ceil(totalBytes / packetPayloadSize);

        for (let i = 0; i < totalPackets; i++) {
            const offset = i * packetPayloadSize;
            const currentPayloadSize = Math.min(packetPayloadSize, totalBytes - offset);

            const payload = bytes.subarray(offset, offset + currentPayloadSize);
            const compressed = lzo1xCompress(payload);
            await this.sendCompressedApdu(compressed, screenIndex, i);

            // Update progress
            progressHandler.onTransferProgress(screenIndex + 1, totalScreens, i + 1, totalPackets);
        }
    }

    protected async sendCompressedApdu(bytes: Uint8Array, screenIndex: number, packetIndex: number) {
        const totalBytes: number = bytes.length;
        const packetPayloadSize = 250;

        let offset = 0;
        let chunkIndex = 0;

        while (offset < totalBytes) {
            const currentPayloadSize = Math.min(packetPayloadSize, totalBytes - offset);
            const isLastPacket = (offset + currentPayloadSize) === totalBytes;

            // Allocate a frame fitted precisely to the payload size + 7 header bytes
            const cmd = new Uint8Array(currentPayloadSize + 7);

            cmd[0] = 0xF0;
            cmd[1] = 0xD3;
            cmd[2] = screenIndex & 0xFF;
            cmd[3] = isLastPacket ? 1 : 0;
            cmd[4] = (currentPayloadSize + 2) & 0xFF;
            cmd[5] = packetIndex & 0xFF;
            cmd[6] = chunkIndex & 0xFF;

            cmd.set(bytes.subarray(offset, offset + currentPayloadSize), 7);
            await EinkIsoDep.transceive({ data: Array.from(cmd) });

            offset += currentPayloadSize;
            chunkIndex++;
        }
    }

    protected async sendApdu(bytes: Uint8Array, screenIndex: number, totalScreens: number, progressHandler: SyncProgressHandler) {
        const totalBytes: number = bytes.length;
        const packetPayloadSize = 250;
        const totalPackets: number = Math.ceil(totalBytes / packetPayloadSize);
        console.log('totalPackets', totalPackets);

        let response;
        for (let i = 0; i < totalPackets; i++) {
            const offset = i * packetPayloadSize;
            const currentPayloadSize = Math.min(packetPayloadSize, totalBytes - offset);

            // Fixed packet size required by protocol (250 payload + 5 header)
            const cmd = new Uint8Array(packetPayloadSize + 5);

            if (currentPayloadSize < packetPayloadSize) {
                // Fill the payload window with 0x01 (Hardware White for 4G mode) to prevent black line artifacts
                cmd.fill(0x01, 5, cmd.length); 
            }

            cmd[0] = 0xF0;
            cmd[1] = 0xD2;  // Load normal image
            cmd[2] = screenIndex & 0xFF;
            cmd[3] = i & 0xFF;
            cmd[4] = 0xFA;

            // Optimized native memory copy equivalent to System.arraycopy
            cmd.set(bytes.subarray(offset, offset + currentPayloadSize), 5);

            // Transceive must be asynchronous to prevent thread blocking
            response = await EinkIsoDep.transceive({ data: Array.from(cmd) });

            // Update progress
            progressHandler.onTransferProgress(screenIndex + 1, totalScreens, i + 1, totalPackets);
        }
    }

    protected async sendImageData(imageData: ImageData, screenIndex: number, progressHandler: SyncProgressHandler) {
        const encoded = encodeImage(imageData, this.deviceInfo.hardwarePalette, this.deviceInfo.imageTransform);

        if (this.deviceInfo.compressionSupport) {
            await this.compressAndSend(encoded, screenIndex, 1, progressHandler);
        } else {
            await this.sendApdu(encoded, screenIndex, 1, progressHandler);
        }
    }

    protected getRefreshCmd() {
        return new Uint8Array([
            0xF0,
            0xD4,
            // Power-on delay time 10*100ms
            // old models use 0x05 here
            // new models support four-color screens and need to be set to 0x85
            this.deviceInfo.refreshCmdVersion === 2 ? 0x85 : 0x05,
            // Direct return + image data writing area
            0x80,
            0x00,
        ]);
    }

    override async syncImage(hardwareConfig: EinkHardwareConfig, imageData: ImageData, progressHandler: SyncProgressHandler) {
        progressHandler.switchStep(SyncStep.SENDING);

        if (this.deviceInfo.pin) {
            // Verify PIN
            const cmd = new Uint8Array([0x00, 0x20, 0x00, 0x01, this.deviceInfo.pin.length, ...this.deviceInfo.pin]);
            await EinkIsoDep.transceive({ data: Array.from(cmd) });
        }

        // Send image
        const screenIndex = 0;
        await this.sendImageData(imageData, screenIndex, progressHandler);

        // EPD refresh
        progressHandler.switchStep(SyncStep.REFRESHING);
        await EinkIsoDep.transceive({ data: Array.from(this.getRefreshCmd()) });
        await this.waitForRefresh(progressHandler);

        // Finished
        progressHandler.switchStep(SyncStep.FINISHED);
    }
}
