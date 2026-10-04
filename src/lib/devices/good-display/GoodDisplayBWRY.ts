import { COLOR_BLACK, COLOR_RED, COLOR_WHITE, COLOR_YELLOW } from "$lib/palettes";
import { GoodDisplayInfo } from "./GoodDisplay";

const GoodDisplayBWRYInfo = {
    ...GoodDisplayInfo,
    paletteId: 'bwry',
    devicePaletteId: 'variant-1',
    hardwarePalette: [COLOR_BLACK, COLOR_WHITE, COLOR_YELLOW, COLOR_RED],
    refreshDuration: 15,
    refreshCmdVersion: 2,
    imageTransform: {
        rotate: true,
        flipHorizontal: false,
        flipVertical: false,
    },
} satisfies Partial<NfcFmscEinkDeviceInfo>;

export const GoodDisplay097BWRYInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWRYInfo,
    id: 'gooddisplay-097-bwry',
    url: 'https://www.good-display.com/product/552.html',
    comment: 'requires NFC-powered driver',
    inch: 0.97,
    width: 184,
    height: 88,
    bezels: {
        top: 5,
        left: 20,
        right: 5,
        bottom: 5,
    },
};

export const GoodDisplay154HiResBWRYInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWRYInfo,
    id: 'gooddisplay-154-hi-res-bwry',
    name: 'Hi-Res',
    url: 'https://www.good-display.com/product/555.html',
    comment: 'requires NFC-powered driver',
    inch: 1.54,
    width: 200,
    height: 200,
    devicePaletteId: 'variant-2',
    deviceConfig: 'A007F01220019000C8'
        + 'A10700120030FFFFFF'
        + 'B1010C'
        + 'B20103'
        + 'B30100'
        + 'C004201EA001'
        + 'C10402A0DD41'
        + 'D10701100000000000'
        + '9000',
    bezels: {
        top: 5,
        left: 5,
        right: 5,
        bottom: 20,
    },
    variants: [{
        id: 'gooddisplay-154-bwry-keychain',
        brand: 'Good Display',
        form: 'keychain',
        url: 'https://www.good-display.com/product/547.html',
            bezels: {
            top: 15,
            bottom: 30,
            left: 15,
            right: 15,
        },
    }, {
        id: 'hipoink-einky-154-bwry-keychain',
        brand: 'Hipoink',
        name: 'Einky',
        form: 'keychain',
        url: 'https://www.alibaba.com/product-detail/Hipoink-1-54-Inch-E-Ink_1601756306882.html',
            bezels: {
            top: 15,
            bottom: 30,
            left: 15,
            right: 15,
            radiusOutside: 10,
        },
        refreshDuration: 25,
        imageTransform: {
            rotate: true,
            flipHorizontal: true,
            flipVertical: false,
        },
        devicePaletteId: 'variant-1',
    }],
};

export const GoodDisplay213BWRYInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWRYInfo,
    id: 'gooddisplay-213-bwry',
    url: 'https://www.good-display.com/product/463.html',
    comment: 'requires NFC-powered driver',
    inch: 2.13,
    width: 250,
    height: 122,
    bezels: {
        top: 5,
        bottom: 5,
        left: 15,
        right: 5,
    },
};

/*
export const GoodDisplay266BWRYInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWRYInfo,
    id: 'gooddisplay-266-bwry',
    url: 'https://www.good-display.com/product/684.html',
    form: 'esl',
    inch: 2.66,
    width: 296,
    height: 152,
    bezels: {
        top: 10,
        bottom: 10,
        left: 20,
        right: 20,
    },
};
*/

export const GoodDisplay266HiResBWRYInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWRYInfo,
    id: 'gooddisplay-266-hi-res-bwry',
    name: 'Hi-Res',
    url: 'https://www.good-display.com/product/467.html',
    comment: 'requires NFC-powered driver',
    inch: 2.66,
    width: 360,
    height: 184,
    bezels: {
        top: 5,
        bottom: 5,
        left: 15,
        right: 5,
    },
};

/*
export const GoodDisplay270BWRYInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWRYInfo,
    id: 'gooddisplay-270-bwry',
    url: 'https://www.good-display.com/product/534.html',
    inch: 2.7,
    width: 264,
    height: 176,
};
*/

export const GoodDisplay290BWRYInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWRYInfo,
    id: 'gooddisplay-290-bwry',
    url: 'https://www.good-display.com/product/742.html',
    comment: 'requires NFC-powered driver',
    inch: 2.9,
    width: 296,
    height: 128,
};

export const GoodDisplay290HiResBWRYInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWRYInfo,
    id: 'gooddisplay-290-hi-res-bwry',
    name: 'Hi-Res',
    url: 'https://www.good-display.com/product/464.html',
    comment: 'requires NFC-powered driver',
    inch: 2.9,
    width: 384,
    height: 168,
};

export const GoodDisplay370BWRYInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWRYInfo,
    id: 'gooddisplay-370-bwry',
    url: 'https://www.good-display.com/product/505.html',
    comment: 'requires NFC-powered driver',
    inch: 3.70,
    width: 416,
    height: 240,
};

export const GoodDisplay420BWRYInfo: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayBWRYInfo,
    id: 'gooddisplay-420-bwry',
    url: 'https://www.good-display.com/product/1048.html',
    comment: 'requires NFC-powered driver',
    inch: 4.2,
    width: 400,
    height: 300,
};
