import { sleep } from "$lib/utils";
import { EinkIsoDep } from "../../plugins/EinkIsoDep";
import { EinkDevice } from "./EinkDevice";

export abstract class NfcEinkDevice extends EinkDevice {
    declare public static readonly REFRESH_DURATION: number;

    protected abstract isScreenBusy(): Promise<boolean>;
    public abstract syncImage(hardwareConfig: EinkHardwareConfig | undefined, imageData: ImageData, progressHandler: SyncProgressHandler): Promise<void>;

    constructor(
        public readonly deviceInfo: NfcEinkDeviceInfo,
    ) {
        super(deviceInfo);
    }

    protected async waitForRefresh(progressHandler: SyncProgressHandler) {
        let refreshRemaining = this.deviceInfo.refreshDuration * 1000;
        const minRemaining = 2 * 1000;
        const maxExtraDuration = 10 * 1000;
        const updateInterval = 100;
        const checkInterval = 500;
        let lastCheck = 0;

        while (refreshRemaining + maxExtraDuration > 0) {
            if (!(await EinkIsoDep.isConnected()).connected) {
                throw new Error('Disconnected');
            }

            progressHandler.onRefreshCountdown(refreshRemaining);
            refreshRemaining -= updateInterval;

            if (minRemaining >= refreshRemaining) {
                // Check screen status
                const now = +new Date;
                if (!lastCheck || now - lastCheck >= checkInterval) {
                    lastCheck = now;
                    if (!await this.isScreenBusy()) {
                        break;
                    }
                }
            }

            await sleep(updateInterval);
        }
    }
}
