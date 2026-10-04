import { PALETTES } from "$lib/palettes";

export abstract class Device {
    /* public palette!: ColorRgb[];
    public devicePalette!: ColorRgb[]; */

    public readonly deviceInfo: BaseDeviceInfo;

    constructor(deviceInfo: BaseDeviceInfo,
    ) {
        this.deviceInfo = {
            ...deviceInfo,
        }
        // this.updatePalette();
    }

    /* public updatePalette(changed: boolean = true, paletteMap?: number[]) {
        const palette = PALETTES[this.deviceInfo.paletteId];

        let devicePalette: DevicePaletteInfo | undefined = undefined;
        if (this.deviceInfo.devicePaletteId) {
            devicePalette = palette.devicePalettes[this.deviceInfo.devicePaletteId as keyof typeof palette.devicePalettes];
        }
        if (!devicePalette) {
            devicePalette = palette;
        }

        this.palette = structuredClone(palette.colors);
        this.devicePalette = structuredClone(devicePalette.colors);
    } */
}
