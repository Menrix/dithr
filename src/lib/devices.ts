import { GoodDisplay360Spectra6Info } from "./devices/good-display/spectra-6/GoodDisplay360Spectra6";
import { ReinkC1BWRYInfo } from "./devices/reink/Reink";
import { XteinkTongCardInfo } from "./devices/xteink/XteinkTongCard";
import { Waveshare154BWRYInfo } from "./devices/waveshare/Waveshare154BWRY";
import { GoodDisplay097BWInfo, GoodDisplay154BWInfo, GoodDisplay213BWInfo, GoodDisplay266BWInfo, GoodDisplay270BWInfo, GoodDisplay290BWInfo, GoodDisplay370BWInfo, GoodDisplay420BWInfo } from "./devices/good-display/GoodDisplayBW";
import { GoodDisplay097BWRYInfo, GoodDisplay154HiResBWRYInfo, GoodDisplay213BWRYInfo, GoodDisplay266HiResBWRYInfo, GoodDisplay290BWRYInfo, GoodDisplay290HiResBWRYInfo, GoodDisplay370BWRYInfo, GoodDisplay420BWRYInfo } from "./devices/good-display/GoodDisplayBWRY";
import { EzSign290BWInfo, EzSign420BWInfo } from "./devices/ezsign/EzSignBW";
import { EzSign213BWRYInfo, EzSign290BWRYInfo, EzSign420BWRYInfo } from "./devices/ezsign/EzSignBWRY";
import { Fmsc398BWRYInfo } from "./devices/fmsc/FmscBWRY";
import { PALETTE_ORDERS } from "./palettes";
import { FILE_DEVICES } from "./devices/fileDevices";

const DEVICES_TREE = [
    // BW
    EzSign290BWInfo,
    EzSign420BWInfo,
    GoodDisplay097BWInfo,
    GoodDisplay154BWInfo,
    GoodDisplay213BWInfo,
    GoodDisplay266BWInfo,
    GoodDisplay270BWInfo,
    GoodDisplay290BWInfo,
    GoodDisplay370BWInfo,
    GoodDisplay420BWInfo,

    // BWRY
    EzSign213BWRYInfo,
    EzSign290BWRYInfo,
    EzSign420BWRYInfo,
    XteinkTongCardInfo,
    GoodDisplay097BWRYInfo,
    GoodDisplay154HiResBWRYInfo,
    GoodDisplay213BWRYInfo,
    GoodDisplay266HiResBWRYInfo,
    GoodDisplay290BWRYInfo,
    GoodDisplay290HiResBWRYInfo,
    GoodDisplay370BWRYInfo,
    GoodDisplay420BWRYInfo,
    ReinkC1BWRYInfo,
    Fmsc398BWRYInfo,

    // Spectra 6
    GoodDisplay360Spectra6Info,

    Waveshare154BWRYInfo,

    // File devices
    ...FILE_DEVICES,
];

export let DEVICES: Record<string, BaseDeviceInfo> = {};
export const DEVICE_BRANDS: string[] = [];
export const DEVICE_COLORS: PaletteId[] = [];
export const DEVICE_SIZES: number[] = [];

export const DEVICE_FORMS: DeviceForm[] = [];
const DEVICE_FORM_NAMES: Record<DeviceForm, string> = {
    screen : 'Screen',
    ereader : 'eReader',
    display : 'Display',
    dashboard : 'Dashboard',
    devkit : 'Dev Kit',
    esl : 'ESL',
    keychain: 'Keychain',
    badge: 'Badge',
    photoframe: 'Photoframe',
    phoneCase: 'Phone case',
    custom: 'Custom device',
};

export function getDeviceFormName(form: DeviceForm) {
    return DEVICE_FORM_NAMES[form];
}

export function getDeviceDisplayName(device: BaseDeviceInfo) {
    if (device.id === 'custom') {
        return 'Custom device';
    }

    let name = [device.brand];

    if (device.fullName) {
        name.push(device.fullName);
        name.push(device.inch + '"');
    } else {
        if (device.name) {
            name.push(device.name);
        }

        name.push(device.inch + '"');
        name.push(DEVICE_FORM_NAMES[device.form!]);
    }

    return name.join(' ');
}

function addDevice(info: BaseDeviceInfo) {
    // Form
    info.form = info.form ?? 'screen';

    // Calculate PPI
    info.ppi = Math.round(Math.sqrt((info.width * info.width) + (info.height * info.height)) / info.inch);

    // Export formats
    info.exportFormats = info.exportFormats ?? ['png', 'jpg', 'bmp'];

    DEVICES[info.id] = info;

    if (DEVICE_BRANDS.indexOf(info.brand) === -1) {
        DEVICE_BRANDS.push(info.brand);
    }

    if (DEVICE_COLORS.indexOf(info.paletteId) === -1) {
        DEVICE_COLORS.push(info.paletteId);
    }

    if (DEVICE_SIZES.indexOf(info.inch) === -1) {
        DEVICE_SIZES.push(info.inch);
    }

    if (DEVICE_FORMS.indexOf(info.form) === -1) {
        DEVICE_FORMS.push(info.form);
    }
}

let largestSize = 0;
for (let info of DEVICES_TREE) {
    addDevice(info);

    if ('variants' in info) {
        info.variants?.forEach(variant => {
            addDevice({
                ...info,

                // Reset
                name: undefined,
                url: undefined,
                ppi: undefined,
                form: undefined,
                comment: undefined,
                variants: undefined,

                ...variant,
            });
        });
    }

    if (info.inch > largestSize) {
        largestSize = info.inch;
    }
}

DEVICE_BRANDS.sort();
DEVICE_SIZES.sort((a, b) => a - b);
DEVICE_FORMS.sort();
DEVICE_COLORS.sort((a, b) => PALETTE_ORDERS.Eink.indexOf(a as any) - PALETTE_ORDERS.Eink.indexOf(b as any));

export const DEVICE_LARGEST_SIZE = Math.min(7, largestSize);
