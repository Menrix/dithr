import { COLOR_BLACK, COLOR_WHITE, COLOR_YELLOW, COLOR_RED } from "$lib/palettes";
import { FmscInfo } from "./Fmsc";

const FmscBWRYInfo = {
    ...FmscInfo,
    brand: 'DIY',
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

export const Fmsc398BWRYInfo: NfcFmscEinkDeviceInfo = {
    ...FmscBWRYInfo,
    id: 'diy-398-bwry-magnetic',
    name: 'Magnetic Eink',
    form: 'display',
    // url: 'https://www.good-display.com/product/552.html',
    inch: 3.97,
    width: 528,
    height: 768,
    bezels: {
        top: 25,
        bottom: 10,
        left: 10,
        right: 10,
    },
};
