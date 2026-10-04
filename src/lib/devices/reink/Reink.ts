import { COLOR_BLACK, COLOR_WHITE, COLOR_YELLOW, COLOR_RED } from "$lib/palettes";
import { NfcFmscEinkDevice } from "../NfcFmscEinkDevice";

export const ReinkC1BWRYInfo: NfcFmscEinkDeviceInfo = {
    id: 'reink-c1-370-bwry',
    brand: 'Reink',
    fullName: 'iPhone case C1',
    class: NfcFmscEinkDevice,
    url: 'https://reinkstone.com/products/reink-case-c1-for-iphone',
    form: 'phoneCase',
    inch: 3.70,
    width: 240,
    height: 416,
    paletteId: 'bwry',
    devicePaletteId: 'variant-1',
    hardwarePalette: [COLOR_BLACK, COLOR_WHITE, COLOR_YELLOW, COLOR_RED],
    bezels: {
        top: 110,
        bottom: 11,
        left: 22,
        right: 22,
        radiusOutside: 15,
    },
    connectionType: 'nfc',
    refreshDuration: 15,
    refreshCmdVersion: 2,
    imageTransform: {
        rotate: true,
        flipHorizontal: true,
        flipVertical: true,
    },
    compressionSupport: true,
};
