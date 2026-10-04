import { Device } from "./Device";

export class FileDevice extends Device {
    constructor(
        public readonly deviceInfo: FileDeviceInfo,
    ) {
        super(deviceInfo);
    }
}
