import { COLOR_BLACK, COLOR_WHITE, COLOR_YELLOW, COLOR_RED } from "$lib/palettes";
import { NfcWaveshareEinkDevice } from "../NfcWaveshareEinkDevice";

export const Waveshare154BWRYInfo: NfcEinkDeviceInfo = {
    id: 'waveshare-154-bwry-keychain',
    brand: 'Waveshare',
    class: NfcWaveshareEinkDevice,
    url: 'https://www.waveshare.com/1.54inch-nfc-powered-e-paper-g.htm',
    form: 'keychain',
    connectionType: 'nfc',
    inch: 1.54,
    width: 200,
    height: 200,
    refreshDuration: 18,
    imageTransform: {
        rotate: true,
        flipHorizontal: true,
        flipVertical: false,
    },
    bezels: {
        top: 15,
        bottom: 30,
        left: 15,
        right: 15,
    },
    paletteId: 'bwry',
    devicePaletteId: 'variant-2',
    hardwarePalette: [COLOR_BLACK, COLOR_WHITE, COLOR_YELLOW, COLOR_RED],
    /*
    variants: [{
        id: 'waveshare-154-bwr-keychain',
        url: 'https://www.waveshare.com/1.54inch-nfc-powered-e-paper-bw.htm',
            brand: 'Waveshare',
        paletteId: 'bwr',
        devicePaletteId: 'variant-1',
    }],
    */
}
