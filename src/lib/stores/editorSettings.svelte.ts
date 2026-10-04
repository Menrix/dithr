import { writable, type Writable } from "svelte/store";
import { Preferences } from '@capacitor/preferences';
import { DEVICES } from "$lib/devices";
import { DitherHalftoneDefaultValues, type DitherHalftoneProps } from "$lib/filters/DitherHalftoneFilter";
import { ColorCorrectionDefaultValues, type ColorCorrectionValueProps } from "$lib/filters/ColorCorrectionFilter";
import { AmdCasDefaultValues, type AmdCasProps } from "$lib/filters/AmdCasFilter";
import { DitherBayerDefaultValues, type DitherBayerProps } from "$lib/filters/DitherBayerFilter";
import { DitherErrorDiffusionDefaultValues, type DitherErrorDiffusionProps } from "$lib/filters/DitherErrorDiffusionFilter";
import { GlitchDefaultValues, type GlitchProps } from "$lib/filters/GlitchFilter";
import { InnerBorderDefaultValues, type InnerBorderProps } from "$lib/filters/InnerBorderFilter";
import { getPalette } from "$lib/palettes";
import { DitherQuantizationDefaultValues, type DitherQuantizationProps } from "$lib/filters/DitherQuantizationFilter";
import { DenoiseFilterDefaultValues, type DenoiseFilterProps } from "$lib/filters/DenoiseFilter";
import { MosaicFilterDefaultValues, type MosaicFilterProps } from "$lib/filters/MosaicFilter";
import { ChromaticAberrationDefaultValues, type ChromaticAberrationProps } from "$lib/filters/ChromaticAberrationFilter";
import { SketchDefaultValues, type SketchProps } from "$lib/filters/SketchFilter";
import { colord } from "colord";
import { BlendColorDefaultValues, type BlendColorProps } from "$lib/filters/BlendColor";
import { DitherErrorOstromoukhovDefaultValues, type DitherErrorOstromoukhovProps } from "$lib/filters/DitherErrorOstromoukhovFilter";
import { DuotoneDefaultValues, type DuotoneProps } from "$lib/filters/DuotoneFilter";

export type AdjustmentsProps = ColorCorrectionValueProps & {
    amdCas: AmdCasProps;
    denoise: DenoiseFilterProps,
};

export type CanvasSettings = {
    orientation: CanvasOrientation,
    bgColor: string;
    width: number;
    height: number;
};

export type DitherSettings = AdjustmentsProps & {
    paletteId: PaletteId;
    devicePaletteId: '' | string;
    paletteMap: number[],

    dither: {
        enabled: boolean;
        method: DitherMethod;
        preferDevicePalette: boolean;
        compressDynamicRange: boolean;
        colorSpace: ColorSpace;
    };

    quantization: Omit<DitherQuantizationProps, 'palette' | 'colorSpace' | 'colorSpacePalette' | 'paletteMap'>;
    bayer: Omit<DitherBayerProps, 'palette' | 'colorSpace' | 'colorSpacePalette' | 'paletteMap'>;
    errorDiffusion: Omit<DitherErrorDiffusionProps, 'palette' | 'colorSpace' | 'colorSpacePalette' | 'paletteMap'>;
    errorOstromoukhov: Omit<DitherErrorOstromoukhovProps, 'palette' | 'colorSpace' | 'colorSpacePalette' | 'paletteMap'>;
    halftone: Omit<DitherHalftoneProps, 'palette' | 'colorSpace' | 'colorSpacePalette' | 'paletteMap'>;

    sketch: SketchProps;
    blendColor: BlendColorProps;
    mosaic: MosaicFilterProps;
    glitch: GlitchProps;
    chromaticAberration: ChromaticAberrationProps;
    duotone: DuotoneProps;
    innerBorder: InnerBorderProps;
};

export type DitherPalette = {
    paletteId: PaletteId;
    palette: PaletteRgb;

    devicePalette: PaletteRgb;

    swatches: string[];

    paletteMap: number[];
    blackColor: ColorRgb | undefined;
    whiteColor: ColorRgb | undefined;
};

let appReady: Writable<boolean> = writable(false);
let targetDeviceId: Writable<'custom' | string> = writable('custom');

Preferences.get({
    key: 'targetDevice',
}).then(value => {
    let { value: initialId } = value;
    if (!initialId || !DEVICES[initialId]) {
        initialId = 'custom';
    }

    targetDeviceId.subscribe(async value => {
        await Preferences.set({
            key: 'targetDevice',
            value,
        });
    });

    targetDeviceId.set(initialId);
    appReady.set(true);
});

const DEFAULT_ADJUSTMENT_SETTINGS: AdjustmentsProps = {
    ...ColorCorrectionDefaultValues,
    amdCas: {
        ...AmdCasDefaultValues,
    },
    denoise: {
        ...DenoiseFilterDefaultValues,
    },
};

const DEFAULT_DITHER_SETTINGS: DitherSettings = {
    paletteId: 'gray-4' satisfies PaletteId,
    devicePaletteId: '',
    paletteMap: [],

    dither: {
        enabled: true,
        method: 'bayer',
        preferDevicePalette: false,
        compressDynamicRange: false,
        colorSpace: 'rgb',
    },

    ...structuredClone(DEFAULT_ADJUSTMENT_SETTINGS),

    quantization: {
        ...DitherQuantizationDefaultValues,
    },

    bayer: {
        ...DitherBayerDefaultValues,
    },

    errorDiffusion: {
        ...DitherErrorDiffusionDefaultValues,
    },

    errorOstromoukhov: {
        ...DitherErrorOstromoukhovDefaultValues,
    },

    halftone: {
        ...DitherHalftoneDefaultValues,
    },

    sketch: {
        ...SketchDefaultValues,
    },

    blendColor: {
        ...BlendColorDefaultValues,
    },

    mosaic: {
        ...MosaicFilterDefaultValues,
    },

    glitch: {
        ...GlitchDefaultValues,
    },

    chromaticAberration: {
        ...ChromaticAberrationDefaultValues,
    },

    innerBorder: {
        ...InnerBorderDefaultValues,
    },

    duotone: {
        ...DuotoneDefaultValues,
    },
};

['quantization', 'bayer', 'errorDiffusion', 'errorOstromoukhov', 'halftone'].forEach(method => {
    ['palette', 'colorSpace', 'colorSpacePalette', 'paletteMap'].forEach(key => {
        delete (DEFAULT_DITHER_SETTINGS[method as DitherMethod] as any)[key];
    });
});

const canvasSettings: CanvasSettings = $state({
    orientation: 'top',
    bgColor: '#fff',
    width: -1,
    height: -1,
});

const ditherSettings: DitherSettings = $state(structuredClone(DEFAULT_DITHER_SETTINGS));

const ditherPalette: DitherPalette = $state({
    paletteId: DEFAULT_DITHER_SETTINGS.paletteId,
    palette: [],
    devicePalette: [],
    paletteMap: [],
    swatches: [],
    blackColor: undefined,
    whiteColor: undefined,
});

export function refreshDitherPalette(force: boolean = false) {
    const rawDitherSettings = $state.snapshot(ditherSettings);
    const paletteInfo = getPalette(rawDitherSettings.paletteId);

    const paletteChanged = rawDitherSettings.paletteId !== ditherPalette.paletteId;
    ditherPalette.paletteId = rawDitherSettings.paletteId;
    ditherPalette.palette = paletteInfo.colors.slice();
    ditherPalette.swatches = ditherPalette.palette.map(value => colord({r: value[0], g: value[1], b: value[2]}).toHex());

    let devicePalette: PaletteRgb | undefined = undefined;
    if (rawDitherSettings.devicePaletteId) {
        if (rawDitherSettings.devicePaletteId in paletteInfo.devicePalettes) {
            devicePalette = (paletteInfo.devicePalettes[rawDitherSettings.devicePaletteId as keyof typeof paletteInfo.devicePalettes] as any).colors;
        }
    }
    if (!devicePalette) {
        devicePalette = $state.snapshot(ditherPalette.palette);
    }
    ditherPalette.devicePalette = devicePalette.slice();

    let blackColor = undefined;
    let whiteColor = undefined;
    if (paletteInfo.devicePalettes && 'colorIndices' in paletteInfo && typeof paletteInfo.colorIndices.black !== 'undefined' && typeof paletteInfo.colorIndices.white !== 'undefined') {
        blackColor = devicePalette[paletteInfo.colorIndices.black];
        whiteColor = devicePalette[paletteInfo.colorIndices.white];
    }
    ditherPalette.blackColor = blackColor;
    ditherPalette.whiteColor = whiteColor;

    // Reset paletteMap if paletteId changed
    if (force || paletteChanged) {
        const tmpMap: number[] = new Array(paletteInfo.colors.length).fill(0);
        ditherSettings.paletteMap = tmpMap.slice();
    }
    // Copy paletteMap from ditherSettings
    ditherPalette.paletteMap = $state.snapshot(ditherSettings.paletteMap);
}

export {
    appReady,
    targetDeviceId,
    canvasSettings,
    ditherSettings,
    ditherPalette,
}
