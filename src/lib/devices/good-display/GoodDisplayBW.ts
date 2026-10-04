import { COLOR_BLACK, COLOR_WHITE } from "$lib/palettes";
import { GoodDisplayInfo } from "./GoodDisplay";

const GoodDisplayBWInfo = {
    ...GoodDisplayInfo,
    paletteId: 'bw',
    devicePaletteId: 'variant-1',
    refreshDuration: 3,
    refreshCmdVersion: 1,
    hardwarePalette: [COLOR_BLACK, COLOR_WHITE],
} satisfies Partial<NfcFmscEinkDeviceInfo>;

export const GoodDisplay097BWInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWInfo,
    id: 'gooddisplay-097-bw',
    url: 'https://www.good-display.com/product/486.html',
    comment: 'requires NFC-powered driver',
    inch: 0.97,
    width: 184,
    height: 88,
};

export const GoodDisplay154BWInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWInfo,
    id: 'gooddisplay-154-bw',
    url: 'https://www.good-display.com/product/556.html',
    comment: 'requires NFC-powered driver',
    inch: 1.54,
    width: 200,
    height: 200,
};

export const GoodDisplay213BWInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWInfo,
    id: 'gooddisplay-213-bw',
    url: 'https://www.good-display.com/product/391.html',
    comment: 'requires NFC-powered driver',
    inch: 2.13,
    width: 250,
    height: 122,
};

export const GoodDisplay266BWInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWInfo,
    id: 'gooddisplay-266-bw',
    url: 'https://www.good-display.com/product/412.html',
    comment: 'requires NFC-powered driver',
    inch: 2.66,
    width: 296,
    height: 152,
};

export const GoodDisplay270BWInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWInfo,
    id: 'gooddisplay-270-bw',
    url: 'https://www.good-display.com/product/432.html',
    comment: 'requires NFC-powered driver',
    inch: 2.7,
    width: 264,
    height: 176,
};

export const GoodDisplay290BWInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWInfo,
    id: 'gooddisplay-290-bw',
    url: 'https://www.good-display.com/product/389.html',
    comment: 'requires NFC-powered driver',
    inch: 2.9,
    width: 296,
    height: 128,
};

export const GoodDisplay370BWInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWInfo,
    id: 'gooddisplay-370-bw',
    url: 'https://www.good-display.com/product/437.html',
    comment: 'requires NFC-powered driver',
    inch: 3.70,
    width: 416,
    height: 240,
};

export const GoodDisplay420BWInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWInfo,
    id: 'gooddisplay-420-bw',
    url: 'https://www.good-display.com/product/386.html',
    comment: 'requires NFC-powered driver',
    inch: 4.2,
    width: 400,
    height: 300,
    variants: [{
        id: 'gooddisplay-420-bw-esl',
        brand: 'Good Display',
        url: 'https://www.good-display.com/product/263.html',
            form: 'esl',
        bezels: {
            top: 20,
            bottom: 20,
            left: 10,
            right: 10,
            radiusOutside: 10,
        }
    }],
};
