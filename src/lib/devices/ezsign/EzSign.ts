import { NfcFmscEinkDevice } from "../NfcFmscEinkDevice";

export const EzSignInfo = {
    brand: 'EZ Sign',
    connectionType: 'nfc',
    imageTransform: {
        rotate: false,
        flipHorizontal: true,
        flipVertical: false,
    },
    compressionSupport: true,
    pin: [0x20, 0x09, 0x12, 0x10],  // '20091210'
    class: NfcFmscEinkDevice,
} satisfies Partial<NfcFmscEinkDeviceInfo>;
