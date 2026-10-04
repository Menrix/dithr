import { NfcFmscEinkDevice } from "$lib/devices/NfcFmscEinkDevice";
import { nearestPaletteIndex } from "$lib/image-encoder";
import { COLOR_BLACK, COLOR_BLUE, COLOR_GREEN, COLOR_RED, COLOR_WHITE, COLOR_YELLOW, PALETTES } from "$lib/palettes";
import { SyncStep } from "$lib/shared";
import { EinkIsoDep } from "../../../plugins/EinkIsoDep";
import { GoodDisplayInfo } from "./GoodDisplay";

export class GoodDisplayS6 extends NfcFmscEinkDevice {
    /**
     * Maps each pixel's RGB value to a bit for every color plane, mirroring
     * ImageUtils.getColorDataBmp24(byte[], byte[][]). Each DeviceInfo color
     * value is a pre-built bitmask across `planeCount` planes (bit i => plane i),
     * so no extra masking is applied beyond the shift, matching source.
     */
    private extractColorPlanes(hardwareConfig: EinkHardwareConfig, image: ImageData): Uint8Array[] {
        const width = this.deviceInfo.width;
        const height = this.deviceInfo.height;
        const picSize = width * height;
        const planeCount = hardwareConfig.extendedColor?.size ?? 1;
        let packedPlaneIndex = 0;

        const planes: Uint8Array[] = Array.from({ length: planeCount }, () => new Uint8Array(width * height));

        const px = image.data;
        let a = 0;

        for (let row = height - 1; row >= 0; row--) {
            for (let col = width - 1; col >= 0; col--) {
                const i = (row * width + col) * 4;
                const colorIdx = nearestPaletteIndex(this.deviceInfo.hardwarePalette, px[i], px[i + 1], px[i + 2]);
                const colorChannel = hardwareConfig.extendedColor?.channels[colorIdx]?.value ?? 0;

                if (colorChannel & 0x80) {
                    // packed-index mode: sequential values into one fixed plane
                    for (let j = 0; j < planeCount; j++) {
                        planes[packedPlaneIndex][a++] = ((colorChannel & 0x7f) >> (planeCount - j - 1)) & 0x01;
                        if (a === picSize) {
                            a = 0;
                            packedPlaneIndex++;
                        }
                    }
                } else {
                    // normal mode: one bit per plane, same pixel index
                    for (let j = 0; j < planeCount; j++) {
                        planes[j][a] = colorChannel >> (planeCount - j - 1);
                    }
                    a++;
                }
            }
        }

        return planes;
    }

    // ---- bit-array -> packed, byte-boundary-padded plane ------------------
    /**
     * Packs one plane's 0/1-per-pixel array into MSB-first bytes, padding each
     * row out to a multiple of 8 pixels with zero. Mirrors
     * ImageUtils.multicolor24horizontalScanning.
     */
    private packPlaneHorizontal(plane: Uint8Array, width: number, height: number): Uint8Array {
        const remainder = width % 8 === 0 ? 0 : 8 - (width % 8);
        const rowWidth = width + remainder;
        const destWidth = rowWidth / 8;
        const packed = new Uint8Array(destWidth * height);

        const bit = new Uint8Array(8);
        let n = 0;
        let col = 0;
        let rowBase = 0;

        const pushBit = (value: number) => {
            bit[n++] = value & 0x01;
            if (n === 8) {
                packed[rowBase + col] =
                    (bit[7] |
                    (bit[6] << 1) |
                    (bit[5] << 2) |
                    (bit[4] << 3) |
                    (bit[3] << 4) |
                    (bit[2] << 5) |
                    (bit[1] << 6) |
                    (bit[0] << 7)) & 0xff;
                n = 0;
                col++;
                if (col === destWidth) {
                    col = 0;
                    rowBase += destWidth;
                }
            }
        };

        for (let row = 0; row < height; row++) {
            for (let x = 0; x < width; x++) {
                pushBit(plane[row * width + x]);
            }
            for (let k = 0; k < remainder; k++) {
                pushBit(0);
            }
        }

        return packed;
    }

    override async syncImage(hardwareConfig: EinkHardwareConfig, imageData: ImageData, progressHandler: SyncProgressHandler) {
        progressHandler.switchStep(SyncStep.SENDING);

        // Send image
        const { width, height } = this.deviceInfo;
        const totalPlanes = hardwareConfig.extendedColor?.size || 1;

        const planes = this.extractColorPlanes(hardwareConfig, imageData);
        const packedPlanes = planes.map((p) => this.packPlaneHorizontal(p, width, height));

        for (let i = 0; i < totalPlanes; i++) {
            const encoded = packedPlanes[i];
            if (this.deviceInfo.compressionSupport) {
                await this.compressAndSend(encoded, i, totalPlanes, progressHandler);
            } else {
                await this.sendApdu(encoded, i, totalPlanes, progressHandler);
            }
        }

        // EPD refresh
        progressHandler.switchStep(SyncStep.REFRESHING);
        await EinkIsoDep.transceive({ data: Array.from(this.getRefreshCmd()) });
        await this.waitForRefresh(progressHandler);

        // Finished
        progressHandler.switchStep(SyncStep.FINISHED);
    }
}

const BLACK: DevicePaletteColor = {
    raw:    [  0,   0,   0],
    device: [ 33,  29,  47],
}

const WHITE: DevicePaletteColor = { 
    raw:    [255, 255, 255],
    device: [154, 164, 162],
};

const RED: DevicePaletteColor = { 
    raw:    [255,   0,   0],
    device: [115,  19,   4],
};

const YELLOW: DevicePaletteColor = {   // Yellow
    raw:    [255, 255,   0],
    device: [161, 153,   3],
};

const GREEN: DevicePaletteColor = {   // Yellow
    raw:    [  0, 255,   0],
    device: [ 52,  91,  58],
};

const BLUE: DevicePaletteColor = {   // Yellow
    raw:    [  0,   0, 255],
    device: [ 24,  82, 139],
};

export const GoodDisplayS6Palette: DevicePaletteColor[] = [BLACK, WHITE, RED, YELLOW, GREEN, BLUE];

export const GoodDisplayS6Info = {
    ...GoodDisplayInfo,
    paletteId: 'spectra-6',
    devicePaletteId: 'variant-1',
    connectionType: 'nfc',
    hardwarePalette: [COLOR_BLACK, COLOR_WHITE, COLOR_RED, COLOR_YELLOW, COLOR_GREEN, COLOR_BLUE],
    refreshDuration: 13,
    refreshCmdVersion: 2,
    imageTransform: {
        rotate: true,
        flipHorizontal: false,
        flipVertical: false,
    },
} satisfies Partial<NfcFmscEinkDeviceInfo>;
