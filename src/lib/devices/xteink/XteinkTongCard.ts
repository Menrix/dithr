import { COLOR_BLACK, COLOR_WHITE, COLOR_YELLOW, COLOR_RED } from "$lib/palettes";
import { NfcFmscEinkDevice } from "../NfcFmscEinkDevice";

export const XteinkTongCardInfo: NfcFmscEinkDeviceInfo = {
    id: 'xteink-tong-card',
    brand: 'Xteink',
    fullName: 'Tong Card',
    class: NfcFmscEinkDevice,
    url: 'https://www.aliexpress.com/w/wholesale-xteink-tong-card.html',
    inch: 2.53,
    width: 428,
    height: 428,
    form: 'keychain',
    bezels: {
        top: 26,
        bottom: 24,
        left: 15,
        right: 15,
        radiusOutside: 10,
    },
    paletteId: 'bwry',
    devicePaletteId: 'variant-2',
    hardwarePalette: [COLOR_BLACK, COLOR_WHITE, COLOR_YELLOW, COLOR_RED],
    connectionType: 'nfc',
    refreshDuration: 13,
    refreshCmdVersion: 2,
    imageTransform: {
        rotate: true,
        flipHorizontal: true,
        flipVertical: false,
    },
    compressionSupport: true,
    variants: [{
        id: 'hipoink-253-bwry-keychain',
        brand: 'Hipoink',
        form: 'keychain',
        name: 'Magnetic',
        url: 'https://www.alibaba.com/product-detail/Hipoink-Magnetic-2-53-Inch-DIY_1601787288235.html',
        }],
};
