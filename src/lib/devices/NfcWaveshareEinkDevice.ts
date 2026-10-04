import { encodeImage } from "$lib/image-encoder";
import { SyncStep } from "$lib/shared";
import { hexStringToBytes, sleep } from "$lib/utils";
import { EinkIsoDep } from "../../plugins/EinkIsoDep";
import { NfcEinkDevice } from "./NfcEinkDevice";

export class NfcWaveshareEinkDevice extends NfcEinkDevice {
    private BWYR_CLA = 0x74;
    private readonly REFRESH_CMD = hexStringToBytes('7402150200');
    private readonly BUSY_STATUS_CMD = hexStringToBytes('749b000f01');

    private apdu(ins: number, p1: number, p2: number, data?: Uint8Array, le = 0x00): Uint8Array {
        if (data && data.length > 0) {
            const f = new Uint8Array(5 + data.length);
            f.set([this.BWYR_CLA, ins, p1, p2, data.length], 0);
            f.set(data, 5);
            return f;
        }
        return Uint8Array.of(this.BWYR_CLA, ins, p1, p2, le);
    }

    private isSuccess(sw: number[]): boolean {
        return sw.length >= 2 && sw[0] === 0x90 && sw[1] === 0x00;
    }

    private async send(ins: number, p1: number, p2: number, data?: Uint8Array, le = 0x00): Promise<number[]> {
        const apdu = this.apdu(ins, p1, p2, data, le);
        const response = await EinkIsoDep.transceive({data: Array.from(apdu)});

        if (!this.isSuccess(response.response)) {
            throw new Error(`APDU ${ins.toString(16)}/${p1.toString(16)}/${p2.toString(16)} failed: [${response.response.join(',')}]`);
        }

        return response.response;
    }

    private async regPair(cmdByte: number, dataByte: number): Promise<void> {
        await this.send(0x99, 0x00, 0x0d, Uint8Array.of(cmdByte));
        await this.send(0x9a, 0x00, 0x0e, Uint8Array.of(dataByte));
    }

    protected override async isScreenBusy(): Promise<boolean> {
        if (!(await EinkIsoDep.isConnected()).connected) {
            return false;
        }

        const response = await EinkIsoDep.transceive({ data: Array.from(this.BUSY_STATUS_CMD) });
        try {
            return response.response[0] === 0x00;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    public async syncImage(hardwareConfig: EinkHardwareConfig, imageData: ImageData, progressHandler: SyncProgressHandler) {
        progressHandler.switchStep(SyncStep.SENDING);

        // Initialization
        await this.send(0xb1, 0x00, 0x00, Uint8Array.of(0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77));
        await this.send(0x97, 0x00, 0x08);
        await sleep(50);
        await this.send(0x97, 0x01, 0x08);
        await sleep(200);
        await this.send(0x00, 0x15, 0x00);
        await sleep(100);

        await this.regPair(0xe0, 0x02);
        await this.regPair(0xe6, 0x5d);
        await this.regPair(0xa5, 0x00);
        await sleep(100);

        // prepare transfer
        await this.send(0x01, 0x15, 0x01);

        // Send image
        const packed = encodeImage(imageData, this.deviceInfo.hardwarePalette, this.deviceInfo.imageTransform);
        const totalBytes: number = packed.length;
        const packetPayloadSize = 250;
        const totalPackets: number = Math.ceil(totalBytes / packetPayloadSize);

        for (let i = 0; i < totalPackets; i++) {
            const offset = i * packetPayloadSize;
            const currentPayloadSize = Math.min(packetPayloadSize, totalBytes - offset);

            const frame = new Uint8Array(packetPayloadSize + 5);
            frame.set([this.BWYR_CLA, 0x9a, 0x00, 0x0e, 250], 0);
            frame.set(packed.subarray(offset, offset + currentPayloadSize), 5);

            const sw = await EinkIsoDep.transceive({ data: Array.from(frame) });
            if (!this.isSuccess(sw.response)) {
                throw new Error(`data block at offset ${offset} rejected: [${sw.response.join(',')}]`);
            }

            // Update progress
            progressHandler.onTransferProgress(1, 1, i + 1, totalPackets);
        }
        await sleep(50);

        // EPD refresh
        progressHandler.switchStep(SyncStep.REFRESHING);
        await EinkIsoDep.transceive({ data: Array.from(this.REFRESH_CMD) });
        await this.waitForRefresh(progressHandler);

        // Finished
        progressHandler.switchStep(SyncStep.FINISHED);
    }
}
