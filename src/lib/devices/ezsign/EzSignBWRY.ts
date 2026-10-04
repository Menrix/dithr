import { COLOR_BLACK, COLOR_RED, COLOR_WHITE, COLOR_YELLOW } from "$lib/palettes";
import { EzSignInfo } from "./EzSign";

const EzSignBWRYInfo = {
    ...EzSignInfo,
    paletteId: 'bwry',
    devicePaletteId: 'variant-2',
    refreshDuration: 18,
    refreshCmdVersion: 2,
    hardwarePalette: [COLOR_BLACK, COLOR_WHITE, COLOR_YELLOW, COLOR_RED],
    imageTransform: {
        rotate: false,
        flipHorizontal: true,
        flipVertical: false,
    },
} satisfies Partial<NfcFmscEinkDeviceInfo>;


export const EzSign213BWRYInfo: NfcFmscEinkDeviceInfo = {
    ...EzSignBWRYInfo,
    id: 'ezsign-213-bwry',
    url: 'https://www.santekshop.com/products/santek-ez-sign-nfc-e-paper-4-color-4-2-inch',
    form: 'display',
    inch: 2.13,
    width: 250,
    height: 122,
    bezels: {
        top: 10,
        bottom: 10,
        left: 20,
        right: 10,
    },
};

export const EzSign290BWRYInfo: NfcFmscEinkDeviceInfo = {
    ...EzSignBWRYInfo,
    id: 'ezsign-290-bwry',
    url: 'https://www.santekshop.com/products/santek-ez-sign-nfc-e-paper-4-color-4-2-inch',
    form: 'display',
    inch: 2.9,
    width: 296,
    height: 128,
    bezels: {
        top: 8,
        bottom: 8,
        left: 15,
        right: 8,
    },
};

export const EzSign420BWRYInfo: NfcFmscEinkDeviceInfo = {
    ...EzSignBWRYInfo,
    id: 'ezsign-420-bwry',
    url: 'https://www.santekshop.com/products/santek-ez-sign-nfc-e-paper-4-color-4-2-inch',
    form: 'display',
    inch: 4.2,
    width: 400,
    height: 300,
    devicePaletteId: 'variant-1',
    imageTransform: {
        rotate: true,
        flipHorizontal: true,
        flipVertical: false,
    },
    bezels: {
        top: 8,
        bottom: 20,
        left: 8,
        right: 8,
    },
};
