import { COLOR_BLACK, COLOR_WHITE } from "$lib/palettes";
import { EzSignInfo } from "./EzSign";

const EzSignBWInfo = {
    ...EzSignInfo,
    paletteId: 'bw',
    devicePaletteId: 'variant-1',
    refreshDuration: 3,
    refreshCmdVersion: 1,
    hardwarePalette: [COLOR_BLACK, COLOR_WHITE],
} satisfies Partial<NfcFmscEinkDeviceInfo>;

/*
export const EzSign213BWInfo: NfcFmscEinkDeviceInfo = {
    ...EzSignBWInfo,
    id: 'ezsign-213-bw',
    url: 'https://www.santekshop.com/products/santek-ez-sign-nfc-e-paper-2-color-4-2-inch',
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
*/

export const EzSign290BWInfo: NfcFmscEinkDeviceInfo = {
    ...EzSignBWInfo,
    id: 'ezsign-290-bw',
    url: 'https://www.santekshop.com/products/santek-ez-sign-nfc-e-paper-2-color-4-2-inch',
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

export const EzSign420BWInfo: NfcFmscEinkDeviceInfo = {
    ...EzSignBWInfo,
    id: 'ezsign-420-bw',
    url: 'https://www.santekshop.com/products/santek-ez-sign-nfc-e-paper-2-color-4-2-inch',
    form: 'display',
    inch: 4.2,
    width: 400,
    height: 300,
    bezels: {
        top: 8,
        bottom: 20,
        left: 8,
        right: 8,
    },
};
