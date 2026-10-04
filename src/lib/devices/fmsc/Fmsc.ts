import { NfcFmscEinkDevice } from "../NfcFmscEinkDevice";


export const FmscInfo = {
    brand: 'FMSC',
    connectionType: 'nfc',
    imageTransform: {
        rotate: false,
        flipHorizontal: true,
        flipVertical: false,
    },
    compressionSupport: true,
    class: NfcFmscEinkDevice,
} satisfies Partial<NfcFmscEinkDeviceInfo>;
