import { Device } from "./Device";

export abstract class EinkDevice extends Device {
    constructor(
        public readonly deviceInfo: EinkDeviceInfo,
    ) {
        super(deviceInfo);
    }
}
