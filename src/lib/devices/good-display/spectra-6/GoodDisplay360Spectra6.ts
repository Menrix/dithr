import { GoodDisplayS6, GoodDisplayS6Info } from "../GoodDisplayS6";


export const GoodDisplay360Spectra6Info: NfcFmscEinkDeviceInfo = {
    ...GoodDisplayS6Info,
    id: 'gooddisplay-360-sp6',
    url: 'https://www.good-display.com/product/1077.html',
    class: GoodDisplayS6,
    inch: 3.6,
    width: 400,
    height: 600,
    form: 'badge',
    bezels: {
        top: 30,
        bottom: 10,
        left: 10,
        right: 10,
        radiusOutside: 10,
    },
    imageTransform: {
        rotate: true,
        flipHorizontal: false,
        flipVertical: false,
    },
    compressionSupport: true,
};
