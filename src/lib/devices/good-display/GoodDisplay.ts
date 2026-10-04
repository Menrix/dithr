import { NfcFmscEinkDevice } from "../NfcFmscEinkDevice";

export const GoodDisplayInfo = {
    brand: 'Good Display',
    connectionType: 'nfc',
    imageTransform: {
        rotate: false,
        flipHorizontal: true,
        flipVertical: false,
    },
    compressionSupport: true,
    class: NfcFmscEinkDevice,
} satisfies Partial<NfcFmscEinkDeviceInfo>;
