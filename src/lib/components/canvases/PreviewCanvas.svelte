<script lang="ts">
import { ditherSettings } from "$lib/stores/editorSettings.svelte";
import { DitherBayerFilter } from "$lib/filters/DitherBayerFilter";
import { DitherErrorDiffusionFilter } from "$lib/filters/DitherErrorDiffusionFilter";
import { DitherHalftoneFilter } from "$lib/filters/DitherHalftoneFilter";
import { AmdCasFilter } from "$lib/filters/AmdCasFilter";
import { FabricImage, filters, StaticCanvas, setFilterBackend } from "fabric";
import { config as fabricConfig } from 'fabric';
import { onMount } from "svelte";
import { DynamicRangeCompressorFilter } from "$lib/filters/DynamicRangeCompressorFilter";
import { ColorCorrectionFilter } from "$lib/filters/ColorCorrectionFilter";
import type { DitherFilter } from "$lib/filters/DitherFilter";
import { GlitchFilter } from "$lib/filters/GlitchFilter";
import { InnerBorderFilter } from "$lib/filters/InnerBorderFilter";
import { rgbToOklab, rgbToLab } from "$lib/color-utils";
import { DitherQuantizationFilter } from "$lib/filters/DitherQuantizationFilter";
import { DenoiseFilter } from "$lib/filters/DenoiseFilter";
import { MosaicFilter } from "$lib/filters/MosaicFilter";
import { ChromaticAberrationFilter } from "$lib/filters/ChromaticAberrationFilter";
import { SketchFilter } from "$lib/filters/SketchFilter";
import { BlendColorFilter } from "$lib/filters/BlendColor";
	import { DitherErrorOstromoukhovFilter } from "$lib/filters/DitherErrorOstromoukhovFilter";
	import { DuotoneFilter } from "$lib/filters/DuotoneFilter";

let {
    width,
    height,
    onMounted,
    palette,
    devicePalette,
    paletteMap,
    blackColor = undefined,
    whiteColor = undefined,
    activeView,
    hidden = false,
}: {
    width: number;
    height: number;
    onMounted: () => void;
    palette: PaletteRgb,
    devicePalette: PaletteRgb,
    paletteMap: number[],
    blackColor: ColorRgb | undefined,
    whiteColor: ColorRgb | undefined,
    activeView: EditorView;
    hidden?: boolean;
} = $props();

let canvasElement: HTMLCanvasElement;
let fabricCanvas: StaticCanvas;
let previewImage: FabricImage;
let hasImageData = $state(false);
let FILTERS_ORDER: filters.BaseFilter<string, object, object>[] = [];

let colorSpace = $derived((ditherSettings.dither.colorSpace ?? 'rgb') satisfies ColorSpace);
let colorSpacePalette = $derived.by(() => {
    const preferDevicePalette = ditherSettings.dither.preferDevicePalette;
    let comparePalette = preferDevicePalette ? devicePalette : palette;

    let colorSpacePalette;
    if (colorSpace === 'oklab') {
        colorSpacePalette = comparePalette.map(item => rgbToOklab(...item));
    } else if (colorSpace === 'lab') {
        colorSpacePalette = comparePalette.map(item => rgbToLab(...item));
    } else {
        colorSpacePalette = comparePalette;
    }

    return colorSpacePalette;
});

const FILTERS: {
    dynamicRangeCompressor: DynamicRangeCompressorFilter,
    colorCorrection: ColorCorrectionFilter,
    amdCas: AmdCasFilter,
    glitch: GlitchFilter,
    innerBorder: InnerBorderFilter,
    denoise: DenoiseFilter,
    blendColor: BlendColorFilter,
    sketch: SketchFilter,
    mosaic: MosaicFilter,
    chromaticAberration: ChromaticAberrationFilter,
    duotone: DuotoneFilter,
    dither: null | DitherFilter<string>,
} = {
    dynamicRangeCompressor: new DynamicRangeCompressorFilter(),
    colorCorrection: new ColorCorrectionFilter(),
    amdCas: new AmdCasFilter(),
    glitch: new GlitchFilter(),
    innerBorder: new InnerBorderFilter(),
    denoise: new DenoiseFilter(),
    blendColor: new BlendColorFilter(),
    sketch: new SketchFilter(),
    mosaic: new MosaicFilter(),
    chromaticAberration: new ChromaticAberrationFilter(),
    duotone: new DuotoneFilter(),
    dither: null,
};

let currentElement: HTMLCanvasElement | null = null;

export function requestRenderAll() {
    if (!hasImageData || activeView !== 'dither') {
        return;
    }

    const rawDitherSettings = $state.snapshot(ditherSettings);

    if (FILTERS.dither) {
        const ditherFilter = FILTERS.dither;

        if (ditherFilter instanceof DitherErrorDiffusionFilter) {
            ditherFilter.updateProps(rawDitherSettings.errorDiffusion);
        } else if (ditherFilter instanceof DitherErrorOstromoukhovFilter) {
            ditherFilter.updateProps(rawDitherSettings.errorOstromoukhov);
        } else if (ditherFilter instanceof DitherBayerFilter) {
            ditherFilter.updateProps(rawDitherSettings.bayer);
        } else if (ditherFilter instanceof DitherHalftoneFilter) {
            ditherFilter.updateProps(rawDitherSettings.halftone);
        } else if (ditherFilter instanceof DitherQuantizationFilter) {
            ditherFilter.updateProps(rawDitherSettings.quantization);
        }
    }

    FILTERS.dynamicRangeCompressor.enabled = !!rawDitherSettings.dither.compressDynamicRange;
    if (FILTERS.dynamicRangeCompressor.enabled) {
        if (typeof blackColor !== 'undefined' && typeof whiteColor !== 'undefined') {
            FILTERS.dynamicRangeCompressor.black = blackColor;
            FILTERS.dynamicRangeCompressor.white = whiteColor;
        } else {
            FILTERS.dynamicRangeCompressor.enabled = false;
        }
    }

    FILTERS.colorCorrection.updateProps(rawDitherSettings);
    // Disable grayscale mode in non-RGB color space
    if (ditherSettings.dither.colorSpace !== 'rgb') {
        FILTERS.colorCorrection.grayscaleMode = 'none';
    }

    FILTERS.amdCas.updateProps(rawDitherSettings.amdCas);
    FILTERS.denoise.updateProps(rawDitherSettings.denoise);

    FILTERS.glitch.updateProps(rawDitherSettings.glitch);
    FILTERS.innerBorder.updateProps(rawDitherSettings.innerBorder);

    FILTERS.sketch.updateProps(rawDitherSettings.sketch);
    FILTERS.mosaic.updateProps(rawDitherSettings.mosaic);
    FILTERS.blendColor.updateProps(rawDitherSettings.blendColor);

    FILTERS.chromaticAberration.updateProps(rawDitherSettings.chromaticAberration);
    FILTERS.duotone.updateProps(rawDitherSettings.duotone);

    previewImage.applyFilters();
    fabricCanvas.requestRenderAll();
}

export function refreshPalette(rerender: boolean = false) {
    if (FILTERS.dither) {
        FILTERS.dither.updateProps({
            palette: $state.snapshot(palette),
            colorSpace: $state.snapshot(colorSpace),
            colorSpacePalette: $state.snapshot(colorSpacePalette),
            paletteMap: $state.snapshot(paletteMap),
        });
    }

    if (activeView === 'dither' && rerender) {
        requestRenderAll();
    }
}

export function switchDitherMethod(method: DitherMethod, enabled: boolean = true) {
    // Remove old dither filter
    if (FILTERS.dither) {
        const idx = previewImage.filters.indexOf(FILTERS.dither!);
        if (idx > -1) {
            previewImage.filters.splice(idx, 1);
        }

        FILTERS.dither = null;
    }

    if (enabled) {
        if (method === 'errorDiffusion') {
            fabricConfig.enableGLFiltering = false;
            FILTERS.dither = new DitherErrorDiffusionFilter(ditherSettings.errorDiffusion);
        } else if (method === 'errorOstromoukhov') {
            fabricConfig.enableGLFiltering = false;
            FILTERS.dither = new DitherErrorOstromoukhovFilter(ditherSettings.errorOstromoukhov);
        } else {
            fabricConfig.enableGLFiltering = true;

            if (method === 'bayer') {
                FILTERS.dither = new DitherBayerFilter(ditherSettings.bayer);
            } else if (method === 'halftone') {
                FILTERS.dither = new DitherHalftoneFilter(ditherSettings.halftone);
            } else if (method === 'quantization') {
                FILTERS.dither = new DitherQuantizationFilter(ditherSettings.quantization);
            }
        }

        if (FILTERS.dither) {
            previewImage.filters = FILTERS_ORDER.slice(0);

            /*
            let index = previewImage.filters.indexOf(FILTERS.pixelate);
            if (index > -1) {
                previewImage.filters.splice(index, 0, FILTERS.dither);
            } else {
                previewImage.filters.push(FILTERS.dither);
            }
            */
            previewImage.filters.push(FILTERS.dither);
        }
    }

    // Reset filter backend
    setFilterBackend(undefined!);

    // Call setElement() to clear previous cache
    // otherwise the canvas will become slow
    if (currentElement) {
        previewImage.setElement(currentElement);
    }

    refreshPalette(true);
}

export function setElement(elm: HTMLCanvasElement) {
    if (!previewImage) {
        return;
    }

    hasImageData = true;
    previewImage.setElement(elm);
    currentElement = elm;
    requestRenderAll();
}

onMount(() => {
    fabricCanvas = new StaticCanvas(canvasElement, {
        enableRetinaScaling: false,
        imageSmoothingEnabled: false,
    });

    // setup filters
    previewImage = new FabricImage('');

    FILTERS_ORDER = [
        FILTERS.duotone,
        FILTERS.blendColor,
        FILTERS.denoise,
        FILTERS.colorCorrection,
        FILTERS.dynamicRangeCompressor,
        FILTERS.amdCas,
        FILTERS.sketch,
        FILTERS.mosaic,
        FILTERS.glitch,
        FILTERS.chromaticAberration,
        FILTERS.innerBorder,
    ],

    fabricCanvas.add(previewImage);
    fabricCanvas.centerObject(previewImage);

    switchDitherMethod(ditherSettings.dither.method);
    onMounted();
});

$effect(() => {
    if (activeView !== 'dither') {
        return;
    }

    if (fabricCanvas.width !== width || fabricCanvas.height !== height) {
        fabricCanvas.setDimensions({
            width,
            height,
        });
        fabricCanvas.centerObject(previewImage);
    }
});

export {
    canvasElement as canvas,
    fabricCanvas,
    width,
    height,
}
</script>

<style>
canvas {
    background-image: 
        linear-gradient(45deg, #ccc 25%, transparent 25%), 
        linear-gradient(-45deg, #ccc 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #ccc 75%), 
        linear-gradient(-45deg, transparent 75%, #ccc 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    background-color: #fff;
}
</style>

<canvas
    bind:this={canvasElement}
    class:hidden={hidden}
    width={width}
    height={height}
    ></canvas>
