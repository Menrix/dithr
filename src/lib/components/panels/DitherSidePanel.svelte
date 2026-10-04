<script lang="ts">
import { canvasSettings, ditherPalette, ditherSettings } from "$lib/stores/editorSettings.svelte";
import ColorPicker from "svelte-awesome-color-picker";
import RadioTabsInput from "../settings/RadioTabsInput.svelte";
import { randomFloat, randomInt } from "$lib/utils";
import ColorPickerWrapper from '../ColorPickerWrapper.svelte';
import type { Device } from "$lib/devices/Device";
import { AmdCasDefaultValues, AmdCasValueRanges } from "$lib/filters/AmdCasFilter";
import { ChromaticAberrationDefaultValues, ChromaticAberrationValueRanges } from "$lib/filters/ChromaticAberrationFilter";
import { type GrayscaleMode, ColorCorrectionDefaultValues, ColorCorrectionValueRanges, ColorCorrectionNeutralValues } from "$lib/filters/ColorCorrectionFilter";
import { DenoiseFilterDefaultValues, DenoiseFilterValueRanges } from "$lib/filters/DenoiseFilter";
import { type DitherBayerMatrixSizeId, DitherBayerDefaultValues, DitherBayerValueRanges } from "$lib/filters/DitherBayerFilter";
import { DitherErrorDiffusionFilter, DitherErrorDiffusionDefaultValues, DitherErrorDiffusionValueRanges } from "$lib/filters/DitherErrorDiffusionFilter";
import { type DitherHalftoneProps, type DitherHalftoneShapeId, DitherHalftoneDefaultValues, DitherHalftoneValueRanges, HALFTONE_POLYGON_SIDES } from "$lib/filters/DitherHalftoneFilter";
import { GlitchValueRanges, GlitchDefaultValues } from "$lib/filters/GlitchFilter";
import { InnerBorderDefaultValues, InnerBorderValueRanges } from "$lib/filters/InnerBorderFilter";
import { MosaicFilterDefaultValues, MosaicValueRanges } from "$lib/filters/MosaicFilter";
import ShuffleIcon from "phosphor-svelte/lib/ShuffleIcon";
import PaletteCustomizer from "../PaletteCustomizer.svelte";
import PalettePicker from "../PalettePicker.svelte";
import CheckboxInput from "../settings/CheckboxInput.svelte";
import RangeInput from "../settings/RangeInput.svelte";
import CanvasPanel from "./CanvasPanel.svelte";
import Dropdown from "../settings/Dropdown.svelte";
import { SketchDefaultValues, SketchValueRanges } from "$lib/filters/SketchFilter";
import { BlendColorDefaultValues, BlendColorValueRanges } from "$lib/filters/BlendColor";
import { BlendModeNames } from "$lib/filters/BaseFilter";
import { DitherErrorOstromoukhovDefaultValues } from "$lib/filters/DitherErrorOstromoukhovFilter";

type DitherTab = keyof typeof DITHER_TABS;
const DITHER_TABS = {
    dither: 'Dither',
    adjust: 'Adjust',
    fx: 'FX',
} satisfies Record<string, string>;

let {
    activeView,
    isCustomDevice,
    targetDevice,
    canvasPanel,
}: {
    activeView: EditorView,
    isCustomDevice: boolean,
    targetDevice: Device, 
    canvasPanel: CanvasPanel,
} = $props();

let currentDitherTab: DitherTab = $state('dither');

// Predict the slowness of Error Diffusion filter
let snails = $derived.by(() => {
    const pixels = canvasSettings.width * canvasSettings.height;

    if (pixels >= 500000) {
        return '🐌🐌🐌';
    } else if (pixels >= 300000) {
        return '🐌🐌';
    }

    return '🐌';
});

function toggleFilter(key: 'duotone' | 'blendColor' | 'glitch' | 'chromaticAberration' | 'innerBorder' | 'mosaic' | 'sketch' , checked: boolean) {
    ditherSettings[key].enabled = checked;
    canvasPanel.requestRenderPreview();
}

function randomizeGlitch() {
    ditherSettings.glitch.seed = randomInt.apply(null, GlitchValueRanges.seed);
    ditherSettings.glitch.intensity = randomFloat.apply(null, GlitchValueRanges.intensity);
    ditherSettings.glitch.sliceCount = randomInt.apply(null, GlitchValueRanges.sliceCount);

    canvasPanel.requestRenderPreview();
}

function handleRefreshPalettes() {
    canvasPanel.refreshPalettes();
}

function handleRefreshPreview() {
    canvasPanel.requestRenderPreview();
}

function switchDitherTab(tab: DitherTab): any {
    currentDitherTab = tab;
}
</script>

<style>
@reference "tailwindcss";

.dither-methods {
    :global(input[value="errorDiffusion"]) {
        &::after {
            content: 'Error Diffusion' var(--snails, '');
        }
    }

    :global(input[value="errorOstromoukhov"]) {
        &::after {
            content: 'Ostromoukhov' var(--snails, '');
        }
    }
}
</style>

<div class="editor-panel" class:hidden!={activeView !== 'dither'}>
    <div class="grid gap-5">
        <div role="tablist" class="tabs tabs-lift w-full">
            {#each Object.entries(DITHER_TABS) as [tabId, tabName]}
                <a tabindex="-1" role="tab" class="tab" class:tab-active={currentDitherTab === tabId} onclick={() => switchDitherTab(tabId as DitherTab)}>
                    <span>{tabName}</span>
                </a>
            {/each}
        </div>

        <!-- DITHER TAB -->
        <div class="grid gap-5" class:hidden={currentDitherTab !== 'dither'}>
            <fieldset class="fieldset fieldset-headless fieldset-empty"></fieldset>

            <fieldset class="fieldset border-base-300 rounded-box border-2 p-4 grid gap-y-3">
                <legend class="fieldset-legend">
                    <label>Palette</label>
                </legend>
                <div class="grid gap-3">
                    <PalettePicker
                        sourcePaletteId={targetDevice.deviceInfo.paletteId}
                        sourceDevicePaletteId={targetDevice.deviceInfo.devicePaletteId}
                        bind:paletteId={ditherSettings.paletteId}
                        bind:devicePaletteId={ditherSettings.devicePaletteId}
                        onchange={handleRefreshPalettes}
                        limitedPaletteId={isCustomDevice || targetDevice.deviceInfo.paletteId === 'full-color' ? '' : ditherSettings.paletteId}
                        />

                    <PaletteCustomizer
                        bind:value={ditherSettings.paletteMap}
                        paletteId={ditherSettings.paletteId}
                        devicePalette={ditherPalette.devicePalette}
                        onchange={handleRefreshPalettes}
                        />

                    <RadioTabsInput
                        label="Color space"
                        bind:value={ditherSettings.dither.colorSpace}
                        radioTabs={{
                            rgb: 'RGB',
                            oklab: 'Oklab',
                            lab: 'Lab',
                        } satisfies Record<ColorSpace, string>}
                        equally={true}
                        onchange={handleRefreshPalettes}
                        />

                    {#if ditherSettings.devicePaletteId}
                        <CheckboxInput
                            label="Prefer device's palette"
                            bind:checked={ditherSettings.dither.preferDevicePalette}
                            onchange={handleRefreshPalettes}
                            />

                        {#if ditherPalette.blackColor}
                            <CheckboxInput
                                label="Compress dynamic range"
                                bind:checked={ditherSettings.dither.compressDynamicRange}
                                onchange={handleRefreshPalettes}
                                />
                        {/if}
                    {/if}
                </div>
            </fieldset>

            <fieldset class="fieldset border-base-300 rounded-box border-2 p-4 grid gap-y-3">
                <legend class="fieldset-legend">
                    <label>Dither</label>
                </legend>
                <div class="grid gap-3">
                    <div class="dither-methods" style:--snails={snails ? `" ${snails}"` : ''}>
                        <RadioTabsInput
                            label="Method"
                            bind:value={ditherSettings.dither.method}
                            radioTabs={{
                                bayer: 'Bayer',
                                halftone: 'Halftone',
                                errorDiffusion: 'Error Diffusion',
                                errorOstromoukhov: 'Ostromoukhov',
                                quantization: 'Quantization',
                            } satisfies Record<DitherMethod, string>}
                            equally={true}
                            onchange={value => canvasPanel.previewCanvas.switchDitherMethod(value as DitherMethod)}
                            />
                    </div>

                    {#if ditherSettings.dither.method === 'errorDiffusion'}
                        <CheckboxInput
                            label="Serpentine scanning"
                            bind:checked={ditherSettings.errorDiffusion.serpentine}
                            onchange={handleRefreshPreview}
                            />
                        <CheckboxInput
                            label="Hybrid mode"
                            bind:checked={ditherSettings.errorDiffusion.hybridMode}
                            onchange={handleRefreshPreview}
                            />
                        <Dropdown
                            bind:value={ditherSettings.errorDiffusion.kernelHigh}
                            label={ditherSettings.errorDiffusion.hybridMode ? 'Kernel #1' : 'Kernel'}
                            options={DitherErrorDiffusionFilter.KERNEL_NAMES}
                            onchange={handleRefreshPreview}
                            autoClose={false}
                            />
                        <Dropdown
                            bind:value={ditherSettings.errorDiffusion.kernelLow}
                            label="Kernel #2"
                            options={DitherErrorDiffusionFilter.KERNEL_NAMES}
                            onchange={handleRefreshPreview}
                            autoClose={false}
                            visible={ditherSettings.errorDiffusion.hybridMode}
                            />
                        <RangeInput
                            label="Gray level threshold"
                            defaultValue={DitherErrorDiffusionDefaultValues.grayThreshold}
                            bind:value={ditherSettings.errorDiffusion.grayThreshold}
                            min={DitherErrorDiffusionValueRanges.grayThreshold[0]}
                            max={DitherErrorDiffusionValueRanges.grayThreshold[1]}
                            step={DitherErrorDiffusionValueRanges.grayThreshold[2]}
                            visible={ditherSettings.errorDiffusion.hybridMode}
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            />
                        <RangeInput
                            label="Gray softness"
                            defaultValue={DitherErrorDiffusionDefaultValues.graySoftness}
                            bind:value={ditherSettings.errorDiffusion.graySoftness}
                            min={DitherErrorDiffusionValueRanges.graySoftness[0]}
                            max={DitherErrorDiffusionValueRanges.graySoftness[1]}
                            step={DitherErrorDiffusionValueRanges.graySoftness[2]}
                            visible={ditherSettings.errorDiffusion.hybridMode}
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            />
                        <RangeInput
                            label="Pixel size"
                            defaultValue={DitherErrorDiffusionDefaultValues.pixelSize}
                            bind:value={ditherSettings.errorDiffusion.pixelSize}
                            min={DitherErrorDiffusionValueRanges.pixelSize[0]}
                            max={DitherErrorDiffusionValueRanges.pixelSize[1]}
                            step={DitherErrorDiffusionValueRanges.pixelSize[2]}
                            oninput={handleRefreshPreview}
                            unit="px"
                            />
                        <RangeInput
                            label="Strength"
                            defaultValue={DitherErrorDiffusionDefaultValues.strength}
                            bind:value={ditherSettings.errorDiffusion.strength}
                            min={DitherErrorDiffusionValueRanges.strength[0]}
                            max={DitherErrorDiffusionValueRanges.strength[1]}
                            step={DitherErrorDiffusionValueRanges.strength[2]}
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            />
                    {:else if ditherSettings.dither.method === 'errorOstromoukhov'}
                        <CheckboxInput
                            label="Serpentine scanning"
                            bind:checked={ditherSettings.errorOstromoukhov.serpentine}
                            onchange={handleRefreshPreview}
                            />
                        <RangeInput
                            label="Pixel size"
                            defaultValue={DitherErrorOstromoukhovDefaultValues.pixelSize}
                            bind:value={ditherSettings.errorOstromoukhov.pixelSize}
                            min={DitherErrorDiffusionValueRanges.pixelSize[0]}
                            max={DitherErrorDiffusionValueRanges.pixelSize[1]}
                            step={DitherErrorDiffusionValueRanges.pixelSize[2]}
                            oninput={handleRefreshPreview}
                            unit="px"
                            />
                        <RangeInput
                            label="Strength"
                            defaultValue={DitherErrorOstromoukhovDefaultValues.strength}
                            bind:value={ditherSettings.errorOstromoukhov.strength}
                            min={DitherErrorDiffusionValueRanges.strength[0]}
                            max={DitherErrorDiffusionValueRanges.strength[1]}
                            step={DitherErrorDiffusionValueRanges.strength[2]}
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            />
                    {:else if ditherSettings.dither.method === 'bayer'}
                        <RadioTabsInput
                            bind:value={ditherSettings.bayer.matrixSize}
                            label="Matrix size"
                            radioTabs={{
                                    '2x2': '2x2',
                                    // '3x3': '3x3',
                                    '4x4': '4x4',
                                    '8x8': '8x8',
                                } satisfies Record<DitherBayerMatrixSizeId, string>}
                            onchange={handleRefreshPreview}
                            />
                        <RangeInput
                            label="Pixel size"
                            defaultValue={DitherBayerDefaultValues.pixelSize}
                            bind:value={ditherSettings.bayer.pixelSize}
                            min={DitherBayerValueRanges.pixelSize[0]}
                            max={DitherBayerValueRanges.pixelSize[1]}
                            step={DitherBayerValueRanges.pixelSize[2]}
                            oninput={handleRefreshPreview}
                            unit="px"
                            />
                        <RangeInput
                            label="Strength"
                            defaultValue={DitherBayerDefaultValues.strength}
                            bind:value={ditherSettings.bayer.strength}
                            min={DitherBayerValueRanges.strength[0]}
                            max={DitherBayerValueRanges.strength[1]}
                            step={DitherBayerValueRanges.strength[2]}
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            />
                    {:else if ditherSettings.dither.method === 'halftone'}
                        <Dropdown
                            bind:value={ditherSettings.halftone.dotShape}
                            label="Dot shape"
                            options={{
                                    dot: 'Dot',
                                    polygon: 'Polygon',
                                    line: 'Line',
                                    triangle: 'Triangle',
                                    radial: 'Radial',
                                    squaredot: 'Square-Dot',
                                    cross: 'Cross',
                                    // diamond: 'Diamond',
                                    // square: 'Square',
                                } satisfies Partial<Record<DitherHalftoneShapeId, string>>}
                            onchange={handleRefreshPreview}
                            autoClose={false}
                            />

                        <CheckboxInput
                            label="Invert"
                            bind:checked={ditherSettings.halftone.invertDots}
                            onchange={handleRefreshPreview}
                            visible={ditherSettings.halftone.dotShape !== 'dot' || ditherSettings.halftone.dotsMode !== 'channelSeparation'}
                            />

                        {#if ditherSettings.halftone.dotShape === 'dot'}
                            <RadioTabsInput
                                label="Mode"
                                bind:value={ditherSettings.halftone.dotsMode}
                                radioTabs={{
                                    normal: 'Normal',
                                    independent: 'Independant dots',
                                    channelSeparation: 'Channel separation',
                                } satisfies Record<DitherHalftoneProps['dotsMode'], string>}
                                equally={true}
                                onchange={handleRefreshPreview}
                                />
                        {/if}

                        <RangeInput
                            label="Dot size"
                            defaultValue={DitherHalftoneDefaultValues.dotSize}
                            bind:value={ditherSettings.halftone.dotSize}
                            min={DitherHalftoneValueRanges.dotSize[0]}
                            max={DitherHalftoneValueRanges.dotSize[1]}
                            step={ditherSettings.halftone.dotShape === 'triangle' ? 1 : DitherHalftoneValueRanges.dotSize[2]}
                            textMultiply={1}
                            minDecimal={2}
                            oninput={handleRefreshPreview}
                            />
                        <RangeInput
                            label="Strength"
                            defaultValue={DitherHalftoneDefaultValues.strength}
                            bind:value={ditherSettings.halftone.strength}
                            min={DitherHalftoneValueRanges.strength[0]}
                            max={DitherHalftoneValueRanges.strength[1]}
                            step={DitherHalftoneValueRanges.strength[2]}
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            visible={ditherSettings.halftone.dotShape !== 'dot' || ditherSettings.halftone.dotsMode === 'normal'}
                            />
                        <RangeInput
                            label="Spacing multiplier"
                            defaultValue={DitherHalftoneDefaultValues.spacingMultiplier}
                            bind:value={ditherSettings.halftone.spacingMultiplier}
                            min={DitherHalftoneValueRanges.spacingMultiplier[0]}
                            max={DitherHalftoneValueRanges.spacingMultiplier[1]}
                            step={DitherHalftoneValueRanges.spacingMultiplier[2]}
                            unit="%"
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            />

                        <RangeInput
                            label="Rotation"
                            defaultValue={ditherSettings.halftone.dotShape === 'triangle' ? 0 : DitherHalftoneDefaultValues.rotation}
                            bind:value={ditherSettings.halftone.rotation}
                            min={DitherHalftoneValueRanges.rotation[0]}
                            max={DitherHalftoneValueRanges.rotation[1]}
                            step={ditherSettings.halftone.dotShape === 'triangle' ? 90 : DitherHalftoneValueRanges.rotation[2]}
                            unit="°"
                            oninput={handleRefreshPreview}
                            visible={ditherSettings.halftone.dotShape !== 'radial'}
                            />

                        {#if ditherSettings.halftone.dotShape === 'dot'}
                            <div class="divider"></div>

                            <RangeInput
                                label="Halo width"
                                defaultValue={DitherHalftoneDefaultValues.haloWidth}
                                bind:value={ditherSettings.halftone.haloWidth}
                                min={DitherHalftoneValueRanges.haloWidth[0]}
                                max={DitherHalftoneValueRanges.haloWidth[1]}
                                step={DitherHalftoneValueRanges.haloWidth[2]}
                                textMultiply={100}
                                oninput={handleRefreshPreview}
                                visible={ditherSettings.halftone.dotsMode === 'independent'}
                                />

                            <CheckboxInput
                                label="Checkerboard mode"
                                bind:checked={ditherSettings.halftone.gooeynessCheckerboard}
                                onchange={handleRefreshPalettes}
                                visible={ditherSettings.halftone.dotsMode === 'normal'}
                                />

                            <RangeInput
                                label="Gooeyness"
                                defaultValue={DitherHalftoneDefaultValues.gooeyness}
                                bind:value={ditherSettings.halftone.gooeyness}
                                min={DitherHalftoneValueRanges.gooeyness[0]}
                                max={DitherHalftoneValueRanges.gooeyness[1]}
                                step={DitherHalftoneValueRanges.gooeyness[2]}
                                textMultiply={100}
                                oninput={handleRefreshPreview}
                                visible={ditherSettings.halftone.dotsMode === 'normal'}
                                />
                            <RangeInput
                                label="Maximum dot radius"
                                defaultValue={DitherHalftoneDefaultValues.maxDotRadius}
                                bind:value={ditherSettings.halftone.maxDotRadius}
                                min={DitherHalftoneValueRanges.maxDotRadius[0]}
                                max={DitherHalftoneValueRanges.maxDotRadius[1]}
                                step={DitherHalftoneValueRanges.maxDotRadius[2]}
                                textMultiply={100}
                                oninput={handleRefreshPreview}
                                visible={ditherSettings.halftone.dotsMode === 'normal'}
                                />
                        {/if}

                        {#if ditherSettings.halftone.dotShape === 'polygon'}
                            <div class="divider"></div>

                            <RadioTabsInput
                                label="Polygon"
                                bind:value={ditherSettings.halftone.polygonType}
                                radioTabs={{
                                    // triangle: 'Triangle',
                                    square: 'Square',
                                    pentagon: 'Pentagon',
                                    hexagon: 'Hexagon',
                                } as Record<keyof typeof HALFTONE_POLYGON_SIDES, string>}
                                equally={true}
                                onchange={handleRefreshPreview}
                                />
                            <RangeInput
                                label="Polygon wobble"
                                defaultValue={DitherHalftoneDefaultValues.polygonWobble}
                                bind:value={ditherSettings.halftone.polygonWobble}
                                min={DitherHalftoneValueRanges.polygonWobble[0]}
                                max={DitherHalftoneValueRanges.polygonWobble[1]}
                                step={DitherHalftoneValueRanges.polygonWobble[2]}
                                oninput={handleRefreshPreview}
                                unit="°"
                                />

                            <RangeInput
                                label="Gooeyness"
                                defaultValue={DitherHalftoneDefaultValues.gooeyness}
                                bind:value={ditherSettings.halftone.gooeyness}
                                min={DitherHalftoneValueRanges.gooeyness[0]}
                                max={DitherHalftoneValueRanges.gooeyness[1]}
                                step={DitherHalftoneValueRanges.gooeyness[2]}
                                textMultiply={100}
                                oninput={handleRefreshPreview}
                                />
                            <RangeInput
                                label="Maximum dot radius"
                                defaultValue={DitherHalftoneDefaultValues.maxDotRadius}
                                bind:value={ditherSettings.halftone.maxDotRadius}
                                min={DitherHalftoneValueRanges.maxDotRadius[0]}
                                max={DitherHalftoneValueRanges.maxDotRadius[1]}
                                step={DitherHalftoneValueRanges.maxDotRadius[2]}
                                textMultiply={100}
                                oninput={handleRefreshPreview}
                                />
                        {/if}

                        {#if ditherSettings.halftone.dotShape === 'radial'}
                            <div class="divider"></div>
                            <RangeInput
                                label="Spiral tightness"
                                defaultValue={DitherHalftoneDefaultValues.radialSpiralTightness}
                                bind:value={ditherSettings.halftone.radialSpiralTightness}
                                min={DitherHalftoneValueRanges.radialSpiralTightness[0]}
                                max={DitherHalftoneValueRanges.radialSpiralTightness[1]}
                                step={DitherHalftoneValueRanges.radialSpiralTightness[2]}
                                textMultiply={100}
                                oninput={handleRefreshPreview}
                                />

                            <RangeInput
                                label="Center X"
                                defaultValue={DitherHalftoneDefaultValues.radialCenterX}
                                bind:value={ditherSettings.halftone.radialCenterX}
                                min={-canvasSettings.width}
                                max={canvasSettings.width}
                                step={DitherHalftoneValueRanges.radialCenterX[2]}
                                oninput={handleRefreshPreview}
                                />

                            <RangeInput
                                label="Center Y"
                                defaultValue={DitherHalftoneDefaultValues.radialCenterY}
                                bind:value={ditherSettings.halftone.radialCenterY}
                                min={-canvasSettings.height}
                                max={canvasSettings.height}
                                step={DitherHalftoneValueRanges.radialCenterY[2]}
                                oninput={handleRefreshPreview}
                                />
                        {/if}

                        {#if ditherSettings.halftone.dotShape === 'line'}
                            <div class="divider"></div>
                            <RangeInput
                                label="Wave amplitude"
                                defaultValue={DitherHalftoneDefaultValues.lineWaveAmplitude}
                                bind:value={ditherSettings.halftone.lineWaveAmplitude}
                                min={DitherHalftoneValueRanges.lineWaveAmplitude[0]}
                                max={DitherHalftoneValueRanges.lineWaveAmplitude[1]}
                                step={DitherHalftoneValueRanges.lineWaveAmplitude[2]}
                                textMultiply={100}
                                oninput={handleRefreshPreview}
                                />
                            <RangeInput
                                label="Wave frequency"
                                defaultValue={DitherHalftoneDefaultValues.lineWaveFrequency}
                                bind:value={ditherSettings.halftone.lineWaveFrequency}
                                min={DitherHalftoneValueRanges.lineWaveFrequency[0]}
                                max={DitherHalftoneValueRanges.lineWaveFrequency[1]}
                                step={DitherHalftoneValueRanges.lineWaveFrequency[2]}
                                textMultiply={100}
                                oninput={handleRefreshPreview}
                                disabled={() => ditherSettings.halftone.lineWaveAmplitude === 0}
                                />
                        {/if}

                        {#if ditherSettings.halftone.dotShape === 'squaredot'}
                            <div class="divider"></div>
                            <RangeInput
                                label="Dot threshold"
                                defaultValue={DitherHalftoneDefaultValues.squareDotThreshold}
                                bind:value={ditherSettings.halftone.squareDotThreshold}
                                min={DitherHalftoneValueRanges.squareDotThreshold[0]}
                                max={DitherHalftoneValueRanges.squareDotThreshold[1]}
                                step={DitherHalftoneValueRanges.squareDotThreshold[2]}
                                textMultiply={100}
                                oninput={handleRefreshPreview}
                                />
                            <RangeInput
                                label="Dot softness"
                                defaultValue={DitherHalftoneDefaultValues.squareDotSoftness}
                                bind:value={ditherSettings.halftone.squareDotSoftness}
                                min={DitherHalftoneValueRanges.squareDotSoftness[0]}
                                max={DitherHalftoneValueRanges.squareDotSoftness[1]}
                                step={DitherHalftoneValueRanges.squareDotSoftness[2]}
                                textMultiply={100}
                                oninput={handleRefreshPreview}
                                />
                        {/if}
                    {/if}
                </div>
            </fieldset>
        </div>

        <!-- ADJUST TAB -->
        <div class="grid gap-5" class:hidden={currentDitherTab !== 'adjust'}>
            <fieldset class="fieldset fieldset-headless">
                <div class="grid gap-3">
                    <RadioTabsInput
                        label="Grayscale"
                        radioTabs={{
                            none: 'None',
                            average: 'Average',
                            lightness: 'Lightness',
                            luminosity: 'Luminisity',
                        } satisfies Record<GrayscaleMode, string>}
                        bind:value={ditherSettings.grayscaleMode}
                        onchange={handleRefreshPreview}
                        visible={ditherSettings.dither.colorSpace === 'rgb'}
                        />

                    <CheckboxInput
                        label="Invert colors"
                        bind:checked={ditherSettings.invert}
                        onchange={handleRefreshPreview}
                        />

                    <RangeInput
                        label="Denoise"
                        defaultValue={DenoiseFilterDefaultValues.strength}
                        bind:value={ditherSettings.denoise.strength}
                        min={DenoiseFilterValueRanges.strength[0]}
                        max={DenoiseFilterValueRanges.strength[1]}
                        step={DenoiseFilterValueRanges.strength[2]}
                        textMultiply={100}
                        oninput={handleRefreshPreview}
                        />

                    <RangeInput
                        label="Sharpen"
                        defaultValue={AmdCasDefaultValues.sharpness}
                        bind:value={ditherSettings.amdCas.sharpness}
                        min={AmdCasValueRanges.sharpness[0]}
                        max={AmdCasValueRanges.sharpness[1]}
                        step={AmdCasValueRanges.sharpness[2]}
                        textMultiply={100}
                        oninput={handleRefreshPreview}
                        />
                </div>
            </fieldset>

            <fieldset class="fieldset border-base-300 rounded-box border-2 p-4 grid gap-y-3">
                <legend class="fieldset-legend">
                    <label>Luminance</label>
                </legend>
                <div class="grid gap-3">
                    <RangeInput
                        label="Brightness"
                        defaultValue={ColorCorrectionDefaultValues.brightness}
                        bind:value={ditherSettings.brightness}
                        min={ColorCorrectionValueRanges.brightness[0]}
                        max={ColorCorrectionValueRanges.brightness[1]}
                        step={ColorCorrectionValueRanges.brightness[2]}
                        textMultiply={100}
                        oninput={handleRefreshPreview}
                        />

                    <RangeInput
                        label="Contrast"
                        defaultValue={ColorCorrectionDefaultValues.contrast}
                        bind:value={ditherSettings.contrast}
                        min={ColorCorrectionValueRanges.contrast[0]}
                        max={ColorCorrectionValueRanges.contrast[1]}
                        step={ColorCorrectionValueRanges.contrast[2]}
                        textMultiply={100}
                        oninput={handleRefreshPreview}
                        />

                    <div class="ml-4 grid gap-5">
                        <RangeInput
                            label="Tone Strength"
                            defaultValue={ColorCorrectionDefaultValues.toneStrength}
                            bind:value={ditherSettings.toneStrength}
                            min={ColorCorrectionValueRanges.toneStrength[0]}
                            max={ColorCorrectionValueRanges.toneStrength[1]}
                            step={ColorCorrectionValueRanges.toneStrength[2]}
                            textMultiply={100}
                            unit="%"
                            oninput={handleRefreshPreview}
                            />

                        <RangeInput
                            label="Tone Midpoint"
                            defaultValue={ColorCorrectionDefaultValues.toneMidpoint}
                            bind:value={ditherSettings.toneMidpoint}
                            min={ColorCorrectionValueRanges.toneMidpoint[0]}
                            max={ColorCorrectionValueRanges.toneMidpoint[1]}
                            step={ColorCorrectionValueRanges.toneMidpoint[2]}
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            disabled={ditherSettings.toneStrength === ColorCorrectionNeutralValues.toneStrength}
                            />

                        <RangeInput
                            label="Shadow Boost"
                            defaultValue={ColorCorrectionDefaultValues.shadowBoost}
                            bind:value={ditherSettings.shadowBoost}
                            min={ColorCorrectionValueRanges.shadowBoost[0]}
                            max={ColorCorrectionValueRanges.shadowBoost[1]}
                            step={ColorCorrectionValueRanges.shadowBoost[2]}
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            disabled={ditherSettings.toneStrength === ColorCorrectionNeutralValues.toneStrength}
                            />

                        <RangeInput
                            label="Mid Boost"
                            defaultValue={ColorCorrectionDefaultValues.midBoost}
                            bind:value={ditherSettings.midBoost}
                            min={ColorCorrectionValueRanges.midBoost[0]}
                            max={ColorCorrectionValueRanges.midBoost[1]}
                            step={ColorCorrectionValueRanges.midBoost[2]}
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            disabled={ditherSettings.toneStrength === ColorCorrectionNeutralValues.toneStrength}
                            />

                        <RangeInput
                            label="Highlight Compress"
                            defaultValue={ColorCorrectionDefaultValues.highlightCompress}
                            bind:value={ditherSettings.highlightCompress}
                            min={ColorCorrectionValueRanges.highlightCompress[0]}
                            max={ColorCorrectionValueRanges.highlightCompress[1]}
                            step={ColorCorrectionValueRanges.highlightCompress[2]}
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            disabled={ditherSettings.toneStrength === ColorCorrectionNeutralValues.toneStrength}
                            />
                    </div>

                    <p class="setting-label">Gamma</p>
                    <div class="grid ml-4 gap-5">
                        <RangeInput
                            label="R"
                            defaultValue={ColorCorrectionDefaultValues.gammaR}
                            bind:value={ditherSettings.gammaR}
                            min={ColorCorrectionValueRanges.gammaR[0]}
                            max={ColorCorrectionValueRanges.gammaR[1]}
                            step={ColorCorrectionValueRanges.gammaR[2]}
                            textMultiply={100}
                            minDecimal={0}
                            oninput={handleRefreshPreview}
                            />

                        <RangeInput
                            defaultValue={ColorCorrectionDefaultValues.gammaG}
                            bind:value={ditherSettings.gammaG}
                            label="G"
                            min={ColorCorrectionValueRanges.gammaG[0]}
                            max={ColorCorrectionValueRanges.gammaG[1]}
                            step={ColorCorrectionValueRanges.gammaG[2]}
                            textMultiply={100}
                            minDecimal={0}
                            oninput={handleRefreshPreview}
                            />

                        <RangeInput
                            label="B"
                            defaultValue={ColorCorrectionDefaultValues.gammaB}
                            bind:value={ditherSettings.gammaB}
                            min={ColorCorrectionValueRanges.gammaB[0]}
                            max={ColorCorrectionValueRanges.gammaB[1]}
                            step={ColorCorrectionValueRanges.gammaB[2]}
                            minDecimal={0}
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            />
                    </div>
                </div>
            </fieldset>

            <fieldset class="fieldset border-base-300 rounded-box border-2 p-4 grid gap-y-3">
                <legend class="fieldset-legend">
                    <label>Chrominance</label>
                </legend>
                <div class="grid gap-3">
                    <RangeInput
                        label="Hue rotation"
                        defaultValue={ColorCorrectionDefaultValues.hue}
                        bind:value={ditherSettings.hue}
                        min={ColorCorrectionValueRanges.hue[0]}
                        max={ColorCorrectionValueRanges.hue[1]}
                        step={ColorCorrectionValueRanges.hue[2]}
                        unit='°'
                        oninput={handleRefreshPreview}
                        />

                    <RangeInput
                        label="Vibrance"
                        defaultValue={ColorCorrectionDefaultValues.vibrance}
                        bind:value={ditherSettings.vibrance}
                        min={ColorCorrectionValueRanges.vibrance[0]}
                        max={ColorCorrectionValueRanges.vibrance[1]}
                        step={ColorCorrectionValueRanges.vibrance[2]}
                        textMultiply={100}
                        oninput={handleRefreshPreview}
                        />

                    <RangeInput
                        label="Saturation"
                        defaultValue={ColorCorrectionDefaultValues.saturation}
                        bind:value={ditherSettings.saturation}
                        min={ColorCorrectionValueRanges.saturation[0]}
                        max={ColorCorrectionValueRanges.saturation[1]}
                        step={ColorCorrectionValueRanges.saturation[2]}
                        textMultiply={100}
                        oninput={handleRefreshPreview}
                        />
                </div>
            </fieldset>
        </div>

        <!-- FX TAB -->
        <div class="grid gap-5" class:hidden={currentDitherTab !== 'fx'}>
            <fieldset class="fieldset fieldset-headless fieldset-empty"></fieldset>

            <!-- Duotone -->
            <fieldset class="fieldset border-base-300 rounded-box border-2 p-4 grid gap-y-3">
                <legend class="fieldset-legend">
                    <label for="cbx-duotone">
                        <input type="checkbox" id="cbx-duotone" class="toggle" onchange={(e) => toggleFilter('duotone', (e as any).currentTarget!.checked)} />
                        Duotone
                    </label>
                </legend>

                <div class="grid gap-5" class:hidden={!ditherSettings.duotone.enabled}>
                    <div class="flex gap-5 flex-wrap items-center">
                        <p class="setting-label flex-1">Dark color</p>
                        <ColorPicker
                            swatches={ditherPalette.swatches}
                            // @ts-expect-error
                            components={{wrapper: ColorPickerWrapper}}
                            position="fixed"
                            isDark={true}
                            isAlpha={false}
                            rgb={{r: ditherSettings.duotone.colorDark[0], g: ditherSettings.duotone.colorDark[1], b: ditherSettings.duotone.colorDark[2]}}
                            label=""
                            onInput={(event) => {
                                const rgb = event.rgb!;
                                const currentColor = ditherSettings.duotone.colorDark;
                                if (rgb.r !== currentColor[0] || rgb.g !== currentColor[1] || rgb.b !== currentColor[2]) {
                                    ditherSettings.duotone.colorDark = [rgb.r, rgb.g, rgb.b];
                                    handleRefreshPreview();
                                }
                            }}
                            />
                    </div>
                    <div class="flex gap-5 flex-wrap items-center">
                        <p class="setting-label flex-1">Light color</p>
                        <ColorPicker
                            swatches={ditherPalette.swatches}
                            // @ts-expect-error
                            components={{wrapper: ColorPickerWrapper}}
                            position="fixed"
                            isDark={true}
                            isAlpha={false}
                            rgb={{r: ditherSettings.duotone.colorLight[0], g: ditherSettings.duotone.colorLight[1], b: ditherSettings.duotone.colorLight[2]}}
                            label=""
                            onInput={(event) => {
                                const rgb = event.rgb!;
                                const currentColor = ditherSettings.duotone.colorLight;
                                if (rgb.r !== currentColor[0] || rgb.g !== currentColor[1] || rgb.b !== currentColor[2]) {
                                    ditherSettings.duotone.colorLight = [rgb.r, rgb.g, rgb.b];
                                    handleRefreshPreview();
                                }
                            }}
                            />
                    </div>
                </div>
            </fieldset>

            <!-- Blend Color -->
            <fieldset class="fieldset border-base-300 rounded-box border-2 p-4 grid gap-y-3">
                <legend class="fieldset-legend">
                    <label for="cbx-blend-color">
                        <input type="checkbox" id="cbx-blend-color" class="toggle" onchange={(e) => toggleFilter('blendColor', (e as any).currentTarget!.checked)} />
                        Blend color
                    </label>
                </legend>

                <div class="grid gap-5" class:hidden={!ditherSettings.blendColor.enabled}>
                    <Dropdown
                        label="Mode"
                        options={BlendModeNames}
                        bind:value={ditherSettings.blendColor.mode}
                        onchange={handleRefreshPreview}
                        autoClose={false}
                        />
                    <div class="flex gap-5 flex-wrap items-center">
                        <p class="setting-label flex-1">Color</p>
                        <ColorPicker
                            swatches={ditherPalette.swatches}
                            // @ts-expect-error
                            components={{wrapper: ColorPickerWrapper}}
                            position="fixed"
                            isDark={true}
                            isAlpha={false}
                            rgb={{r: ditherSettings.blendColor.color[0], g: ditherSettings.blendColor.color[1], b: ditherSettings.blendColor.color[2]}}
                            label=""
                            onInput={(event) => {
                                const rgb = event.rgb!;
                                const currentColor = ditherSettings.blendColor.color;
                                if (rgb.r !== currentColor[0] || rgb.g !== currentColor[1] || rgb.b !== currentColor[2]) {
                                    ditherSettings.blendColor.color = [rgb.r, rgb.g, rgb.b];
                                    handleRefreshPreview();
                                }
                            }}
                            />
                    </div>
                    <RangeInput
                        label="Alpha"
                        defaultValue={BlendColorDefaultValues.alpha}
                        bind:value={ditherSettings.blendColor.alpha}
                        min={BlendColorValueRanges.alpha[0]}
                        max={BlendColorValueRanges.alpha[1]}
                        step={BlendColorValueRanges.alpha[2]}
                        textMultiply={100}
                        coloredState={false}
                        oninput={handleRefreshPreview}
                        unit="%"
                        disabled={ditherSettings.blendColor.mode === 'normal'}
                        />
                </div>
            </fieldset>

            <!-- Sketch -->
            <fieldset class="fieldset border-base-300 rounded-box border-2 p-4 grid gap-y-3">
                <legend class="fieldset-legend">
                    <label for="cbx-sketch">
                        <input type="checkbox" id="cbx-sketch" class="toggle" onchange={(e) => toggleFilter('sketch', (e as any).currentTarget!.checked)} />
                        Sketch
                    </label>
                </legend>

                <div class="grid gap-5" class:hidden={!ditherSettings.sketch.enabled}>
                    <CheckboxInput
                        label="Draw on top of image"
                        bind:checked={ditherSettings.sketch.overlayEnabled}
                        onchange={handleRefreshPreview}
                        />
                    <RangeInput
                        label="Overlay opacity"
                        defaultValue={SketchDefaultValues.overlayOpacity}
                        bind:value={ditherSettings.sketch.overlayOpacity}
                        min={SketchValueRanges.overlayOpacity[0]}
                        max={SketchValueRanges.overlayOpacity[1]}
                        step={SketchValueRanges.overlayOpacity[2]}
                        textMultiply={100}
                        unit="%"
                        disabled={!ditherSettings.sketch.overlayEnabled}
                        oninput={handleRefreshPreview}
                        />
                    <RangeInput
                        label="Threshold"
                        defaultValue={SketchDefaultValues.threshold}
                        bind:value={ditherSettings.sketch.threshold}
                        min={SketchValueRanges.threshold[0]}
                        max={SketchValueRanges.threshold[1]}
                        step={SketchValueRanges.threshold[2]}
                        textMultiply={100}
                        oninput={handleRefreshPreview}
                        />
                    <RangeInput
                        label="Intensity"
                        defaultValue={SketchDefaultValues.intensity}
                        bind:value={ditherSettings.sketch.intensity}
                        min={SketchValueRanges.intensity[0]}
                        max={SketchValueRanges.intensity[1]}
                        step={SketchValueRanges.intensity[2]}
                        textMultiply={100}
                        oninput={handleRefreshPreview}
                        />
                    <RangeInput
                        label="Thickness"
                        defaultValue={SketchDefaultValues.thickness}
                        bind:value={ditherSettings.sketch.thickness}
                        min={SketchValueRanges.thickness[0]}
                        max={SketchValueRanges.thickness[1]}
                        step={SketchValueRanges.thickness[2]}
                        textMultiply={10}
                        oninput={handleRefreshPreview}
                        />
                </div>
            </fieldset>

            <!-- MOSAIC -->
            <fieldset class="fieldset border-base-300 rounded-box border-2 p-4 grid gap-y-3">
                <legend class="fieldset-legend">
                    <label for="cbx-mosaic">
                        <input type="checkbox" id="cbx-mosaic" class="toggle" onchange={(e) => toggleFilter('mosaic', (e as any).currentTarget!.checked)} />
                        Mosaic
                    </label>
                </legend>

                <div class="grid gap-5" class:hidden={!ditherSettings.mosaic.enabled}>
                    <RadioTabsInput
                        label="Mode"
                        radioTabs={{
                            pixelate: 'Pixelate',
                            hexagon: 'Hexagon',
                            crystallize: 'Crystallize',
                            lowpoly: 'Low-poly',
                        }}
                        bind:value={ditherSettings.mosaic.mode}
                        onchange={handleRefreshPreview}
                        visible={ditherSettings.dither.method !== 'errorDiffusion'}
                        />
                    <RangeInput
                        label="Cell size"
                        defaultValue={MosaicFilterDefaultValues.cellSize}
                        bind:value={ditherSettings.mosaic.cellSize}
                        min={MosaicValueRanges.cellSize[0]}
                        max={MosaicValueRanges.cellSize[1]}
                        step={MosaicValueRanges.cellSize[2]}
                        oninput={handleRefreshPreview}
                        />
                    <RangeInput
                        label="Grid gap"
                        defaultValue={MosaicFilterDefaultValues.gridGap}
                        bind:value={ditherSettings.mosaic.gridGap}
                        min={MosaicValueRanges.gridGap[0]}
                        max={MosaicValueRanges.gridGap[1]}
                        step={MosaicValueRanges.gridGap[2]}
                        oninput={handleRefreshPreview}
                        minDecimal={2}
                        />
                    <RangeInput
                        label="Jitter"
                        defaultValue={MosaicFilterDefaultValues.jitter}
                        bind:value={ditherSettings.mosaic.jitter}
                        min={MosaicValueRanges.jitter[0]}
                        max={MosaicValueRanges.jitter[1]}
                        step={MosaicValueRanges.jitter[2]}
                        textMultiply={10}
                        oninput={handleRefreshPreview}
                        visible={ditherSettings.dither.method !== 'errorDiffusion' && ditherSettings.mosaic.mode !== 'pixelate'}
                        />
                    <RangeInput
                        label="Light strength"
                        defaultValue={MosaicFilterDefaultValues.lightStrength}
                        bind:value={ditherSettings.mosaic.lightStrength}
                        min={MosaicValueRanges.lightStrength[0]}
                        max={MosaicValueRanges.lightStrength[1]}
                        step={MosaicValueRanges.lightStrength[2]}
                        oninput={handleRefreshPreview}
                        visible={ditherSettings.dither.method !== 'errorDiffusion' && ditherSettings.mosaic.mode !== 'pixelate'}
                        />
                    <RangeInput
                        label="Rotation"
                        defaultValue={MosaicFilterDefaultValues.rotation}
                        bind:value={ditherSettings.mosaic.rotation}
                        min={MosaicValueRanges.rotation[0]}
                        max={MosaicValueRanges.rotation[1]}
                        step={MosaicValueRanges.rotation[2]}
                        unit="°"
                        oninput={handleRefreshPreview}
                        visible={ditherSettings.dither.method !== 'errorDiffusion'}
                        />
                </div>
            </fieldset>

            <!-- Chromatic Aberration -->
            <fieldset class="fieldset border-base-300 rounded-box border-2 p-4 grid gap-y-3">
                <legend class="fieldset-legend">
                    <label for="cbx-chromatic-aberration">
                        <input type="checkbox" id="cbx-chromatic-aberration" class="toggle" onchange={(e) => toggleFilter('chromaticAberration', (e as any).currentTarget!.checked)} />
                        Chromatic Aberration
                    </label>
                </legend>

                <div class="grid gap-5" class:hidden={!ditherSettings.chromaticAberration.enabled}>
                    <CheckboxInput
                        label="Lens-edge falloff"
                        bind:checked={ditherSettings.chromaticAberration.radial}
                        onchange={handleRefreshPreview}
                        />
                    <RangeInput
                        label="Strength"
                        bind:value={ditherSettings.chromaticAberration.strength}
                        defaultValue={ChromaticAberrationDefaultValues.strength}
                        min={ChromaticAberrationValueRanges.strength[0]}
                        max={ChromaticAberrationValueRanges.strength[1]}
                        step={ChromaticAberrationValueRanges.strength[2]}
                        textMultiply={1000}
                        oninput={handleRefreshPreview}
                        />
                    <RangeInput
                        label="Angle"
                        bind:value={ditherSettings.chromaticAberration.angle}
                        defaultValue={ChromaticAberrationDefaultValues.angle}
                        min={ChromaticAberrationValueRanges.angle[0]}
                        max={ChromaticAberrationValueRanges.angle[1]}
                        step={ChromaticAberrationValueRanges.angle[2]}
                        unit="°"
                        oninput={handleRefreshPreview}
                        />
                </div>
            </fieldset>

            <!-- Glitch -->
            <fieldset class="fieldset border-base-300 rounded-box border-2 p-4 grid gap-y-3">
                <legend class="fieldset-legend">
                    <label for="cbx-glitch">
                        <input type="checkbox" id="cbx-glitch" class="toggle" onchange={(e) => toggleFilter('glitch', (e as any).currentTarget!.checked)} />
                        Glitch
                    </label>
                </legend>

                <div class="grid gap-5" class:hidden={!ditherSettings.glitch.enabled}>
                    <button class="btn btn-ghost" onclick={e => randomizeGlitch()}>
                        <ShuffleIcon color="currentColor" size={16} />
                        Randomize
                    </button>
                    <RangeInput
                        label="Intensity"
                        bind:value={ditherSettings.glitch.intensity}
                        min={GlitchValueRanges.intensity[0]}
                        max={GlitchValueRanges.intensity[1]}
                        step={GlitchValueRanges.intensity[2]}
                        textMultiply={100}
                        oninput={handleRefreshPreview}
                        coloredState={false}
                        />
                    <RangeInput
                        label="Slice count"
                        bind:value={ditherSettings.glitch.sliceCount}
                        min={GlitchValueRanges.sliceCount[0]}
                        max={GlitchValueRanges.sliceCount[1]}
                        step={GlitchValueRanges.sliceCount[2]}
                        oninput={handleRefreshPreview}
                        coloredState={false}
                        disabled={ditherSettings.glitch.intensity === 0}
                        />
                    <RangeInput
                        label="Seed"
                        bind:value={ditherSettings.glitch.seed}
                        min={GlitchValueRanges.seed[0]}
                        max={GlitchValueRanges.seed[1]}
                        step={GlitchValueRanges.seed[2]}
                        oninput={handleRefreshPreview}
                        coloredState={false}
                        disabled={() => ditherSettings.glitch.intensity === 0}
                        />
                    <!--
                    <RangeInput
                        label="Noise amount"
                        defaultValue={GlitchDefaultValues.noiseAmount}
                        bind:value={ditherSettings.glitch.noiseAmount}
                        min={0}
                        max={1}
                        step={0.01}
                        textMultiply={100}
                        oninput={handleRefreshPreview}
                        />
                    -->
                    <diu class="divider">RGB SHIFT</diu>

                    <p>R</p>
                    <div class="ml-4 grid gap-5">
                        <RangeInput
                            label="Distance"
                            defaultValue={GlitchDefaultValues.redDistance}
                            bind:value={ditherSettings.glitch.redDistance}
                            min={GlitchValueRanges.redDistance[0]}
                            max={GlitchValueRanges.redDistance[1]}
                            step={GlitchValueRanges.redDistance[2]}
                            unit="px"
                            oninput={handleRefreshPreview}
                            />
                        <RangeInput
                            label="Angle"
                            defaultValue={GlitchDefaultValues.redAngle}
                            bind:value={ditherSettings.glitch.redAngle}
                            min={GlitchValueRanges.redAngle[0]}
                            max={GlitchValueRanges.redAngle[1]}
                            step={GlitchValueRanges.redAngle[2]}
                            unit="°"
                            disabled={() => ditherSettings.glitch.redDistance === 0}
                            oninput={handleRefreshPreview}
                            />
                        <RangeInput
                            label="Opacity"
                            defaultValue={GlitchDefaultValues.redOpacity}
                            bind:value={ditherSettings.glitch.redOpacity}
                            min={GlitchValueRanges.redOpacity[0]}
                            max={GlitchValueRanges.redOpacity[1]}
                            step={GlitchValueRanges.redOpacity[2]}
                            unit='%'
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            disabled={() => ditherSettings.glitch.redDistance === 0}
                            />
                    </div>

                    <p>G</p>
                    <div class="ml-4 grid gap-5">
                        <RangeInput
                            label="Distance"
                            defaultValue={GlitchDefaultValues.greenDistance}
                            bind:value={ditherSettings.glitch.greenDistance}
                            min={GlitchValueRanges.greenDistance[0]}
                            max={GlitchValueRanges.greenDistance[1]}
                            step={GlitchValueRanges.greenDistance[2]}
                            unit="px"
                            oninput={handleRefreshPreview}
                            />
                        <RangeInput
                            label="Angle"
                            defaultValue={GlitchDefaultValues.greenAngle}
                            bind:value={ditherSettings.glitch.greenAngle}
                            min={GlitchValueRanges.greenAngle[0]}
                            max={GlitchValueRanges.greenAngle[1]}
                            step={GlitchValueRanges.greenAngle[2]}
                            unit="°"
                            disabled={() => ditherSettings.glitch.greenDistance === 0}
                            oninput={handleRefreshPreview}
                            />
                        <RangeInput
                            label="Opacity"
                            defaultValue={GlitchDefaultValues.greenOpacity}
                            bind:value={ditherSettings.glitch.greenOpacity}
                            min={GlitchValueRanges.greenOpacity[0]}
                            max={GlitchValueRanges.greenOpacity[1]}
                            step={GlitchValueRanges.greenOpacity[2]}
                            unit="%"
                            textMultiply={100}
                            oninput={handleRefreshPreview}
                            disabled={() => ditherSettings.glitch.greenDistance === 0}
                            />
                    </div>

                    <p>B</p>
                    <div class="ml-4 grid gap-5">
                        <RangeInput
                            label="Distance"
                            defaultValue={GlitchDefaultValues.blueDistance}
                            bind:value={ditherSettings.glitch.blueDistance}
                            min={GlitchValueRanges.blueDistance[0]}
                            max={GlitchValueRanges.blueDistance[1]}
                            step={GlitchValueRanges.blueDistance[2]}
                            unit="px"
                            oninput={handleRefreshPreview}
                            />
                        <RangeInput
                            label="Angle"
                            defaultValue={GlitchDefaultValues.blueAngle}
                            bind:value={ditherSettings.glitch.blueAngle}
                            min={GlitchValueRanges.blueAngle[0]}
                            max={GlitchValueRanges.blueAngle[1]}
                            step={GlitchValueRanges.blueAngle[2]}
                            unit="°"
                            disabled={() => ditherSettings.glitch.blueDistance === 0}
                            oninput={handleRefreshPreview}
                            />
                        <RangeInput
                            label="Opacity"
                            defaultValue={GlitchDefaultValues.blueOpacity}
                            bind:value={ditherSettings.glitch.blueOpacity}
                            min={GlitchValueRanges.blueOpacity[0]}
                            max={GlitchValueRanges.blueOpacity[1]}
                            step={GlitchValueRanges.blueOpacity[2]}
                            textMultiply={100}
                            unit="%"
                            oninput={handleRefreshPreview}
                            disabled={() => ditherSettings.glitch.blueDistance === 0}
                            />
                    </div>
                </div>
            </fieldset>

            <!-- INNER BORDER -->
            <fieldset class="fieldset border-base-300 rounded-box border-2 p-4 grid gap-y-3">
                <legend class="fieldset-legend">
                    <label for="cbx-border">
                        <input type="checkbox" id="cbx-border" class="toggle" onchange={(e) => toggleFilter('innerBorder', (e as any).currentTarget!.checked)} />
                        Inner border
                    </label>
                </legend>

                <div class="grid gap-5" class:hidden={!ditherSettings.innerBorder.enabled}>
                    <Dropdown
                        label="Blend mode"
                        options={BlendModeNames}
                        bind:value={ditherSettings.innerBorder.blendMode}
                        onchange={handleRefreshPreview}
                        autoClose={false}
                        />

                    <div class="flex gap-5 flex-wrap items-center">
                        <p class="setting-label flex-1">Border color</p>
                        <ColorPicker
                            swatches={ditherPalette.swatches}
                            // @ts-expect-error
                            components={{wrapper: ColorPickerWrapper}}
                            position="fixed"
                            isDark={true}
                            isAlpha={true}
                            rgb={{r: ditherSettings.innerBorder.color[0], g: ditherSettings.innerBorder.color[1], b: ditherSettings.innerBorder.color[2], a: ditherSettings.innerBorder.color[3]}}
                            label=""
                            onInput={(event) => {
                                const rgba = event.rgb!;
                                ditherSettings.innerBorder.color = [rgba.r, rgba.g, rgba.b, rgba.a];
                                handleRefreshPreview();
                            }}
                        />
                    </div>

                    <RangeInput
                        label="Width"
                        defaultValue={InnerBorderDefaultValues.width}
                        bind:value={ditherSettings.innerBorder.width}
                        min={InnerBorderValueRanges.width[0]}
                        max={InnerBorderValueRanges.width[1]}
                        step={InnerBorderValueRanges.width[2]}
                        unit="px"
                        oninput={handleRefreshPreview}
                        />

                    <RangeInput
                        label="Inner radius"
                        defaultValue={InnerBorderDefaultValues.radius}
                        bind:value={ditherSettings.innerBorder.radius}
                        min={InnerBorderValueRanges.radius[0]}
                        max={InnerBorderValueRanges.radius[1]}
                        step={InnerBorderValueRanges.radius[2]}
                        unit="px"
                        oninput={handleRefreshPreview}
                        />
                </div>
            </fieldset>
        </div>
    </div>
</div>
