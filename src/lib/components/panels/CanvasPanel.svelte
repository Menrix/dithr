<script lang="ts">
import { canvasSettings, ditherPalette, ditherSettings, refreshDitherPalette } from "$lib/stores/editorSettings.svelte";
import type { HTMLImgComparisonSliderElement } from "img-comparison-slider";
import CanvasSidesIndicator from "../canvases/CanvasSidesIndicator.svelte";
import DevicePreviewCanvas from "../canvases/DevicePreviewCanvas.svelte";
import EditorCanvas from "../canvases/EditorCanvas.svelte";
import PreviewCanvas from "../canvases/PreviewCanvas.svelte";
import EditorToolbar from "../toolbars/EditorToolbar.svelte";
import ViewportToolbar from "../toolbars/ViewportToolbar.svelte";
import "img-comparison-slider";
import { onMount } from "svelte";
import { Preferences } from "@capacitor/preferences";

let {
    activeView,
    canvasPadding,
    onMounted,
}: {
    activeView: EditorView;
    canvasPadding: number;
    onMounted: () => void;
} = $props();

// svelte-ignore non_reactive_update
let editorToolbar: EditorToolbar;
// svelte-ignore non_reactive_update
let editorCanvas: EditorCanvas;
// svelte-ignore non_reactive_update
let previewCanvas: PreviewCanvas;
// svelte-ignore non_reactive_update
let devicePreviewCanvas: DevicePreviewCanvas;
let imgComparisonSlider: HTMLImgComparisonSliderElement;
let isEditorCanvasMounted = $state(false);
let isPreviewCanvasMounted = $state(false);
let beforeImg: HTMLImageElement;
let zoomFactor: CanvasZoomFactor = $state(1);
let panMode = $state(false);

let canvasWidth = $derived(canvasSettings.width);
let canvasHeight = $derived(canvasSettings.height);
let rotatedWidth = $derived(canvasSettings.orientation === 'left' || canvasSettings.orientation === 'right' ? canvasHeight : canvasWidth);
let rotatedHeight = $derived(canvasSettings.orientation === 'left' || canvasSettings.orientation === 'right' ? canvasWidth : canvasHeight);
let actualWidth = $derived(zoomFactor * rotatedWidth);
let actualHeight = $derived(zoomFactor * rotatedHeight);

const croppedCanvas = document.createElement('canvas');
const croppedCanvasCtx = croppedCanvas.getContext('2d')!;
croppedCanvasCtx.imageSmoothingEnabled = false;

let rafId = 0;
let lastRenderPreviewTime = 0;

function requestRenderPreview(updateElement = false) {
    if (rafId) {
        return;  // frame already pending, let it run
    }

    // Increase delay for Error Diffusion methods
    const MIN_REFRESH_DELAY = ditherSettings.dither.method === 'errorDiffusion' || ditherSettings.dither.method === 'errorOstromoukhov' ? 150 : 60;

    const runPipeline: FrameRequestCallback = time => {
        if (time - lastRenderPreviewTime < MIN_REFRESH_DELAY) {
            rafId = requestAnimationFrame(runPipeline);
            return;
        }

        if (updateElement) {
            const staticCanvasElement = editorCanvas.fabricCanvas.toCanvasElement();

            croppedCanvas.width = rotatedWidth;
            croppedCanvas.height = rotatedHeight;
            croppedCanvasCtx.drawImage(staticCanvasElement, canvasPadding, canvasPadding, rotatedWidth, rotatedHeight, 0, 0, rotatedWidth, rotatedHeight);

            beforeImg.src = croppedCanvas.toDataURL();
            previewCanvas.setElement(croppedCanvas);
        } else {
            previewCanvas.requestRenderAll();
        }

        lastRenderPreviewTime = time;
        rafId = 0; // clear, allow next schedule
    }

    rafId = requestAnimationFrame(runPipeline);
}

export function refreshPalettes(force: boolean = false) {
    refreshDitherPalette(force);
    devicePreviewCanvas.refreshPalette(false);
    previewCanvas.refreshPalette(true);
}

export {
    editorToolbar,
    editorCanvas,
    previewCanvas,
    devicePreviewCanvas,
    requestRenderPreview,
    canvasWidth,
    canvasHeight,
}

onMount(() => {
    editorToolbar.initialize(editorCanvas);
    onMounted();
});
</script>

<style>
.canvas-panel {
    @apply
        relative
        flex flex-col w-full
        h-full items-center m-[0_auto] overflow-hidden;

    background-color: color-mix(in oklab, var(--canvas-bg), #0d0d0d);
}

img-comparison-slider {
    --divider-width: 2px;
    --default-handle-opacity: 0;
    --default-handle-transition-time: 200ms;
    --default-handle-color: #fff;
    --divider-color: rgba(255, 255, 255, 0);

    &:focus {
        --default-handle-opacity: 1;
        --divider-color: #fff;
        outline: none;
    }
}
</style>
<div class="canvas-panel" style:--zoom-factor={zoomFactor} style:--zoom-rendering={zoomFactor >= 2 ? 'pixelated' : 'unset'}>
    <EditorToolbar
        bind:this={editorToolbar}
        activeView={activeView}
        />
    <div class="flex flex-1 w-full items-center-safe overflow-auto scrollbar-thin">
        <div class="w-max h-max m-[0_auto] relative" class:hidden={activeView !== 'canvas'} style:margin-top={'var(--editor-toolbar-height)'}>
            <CanvasSidesIndicator orientation={canvasSettings.orientation} padding={canvasPadding} zoomFactor={zoomFactor} />
            <EditorCanvas bind:this={editorCanvas}
                width={rotatedWidth}
                height={rotatedHeight}
                padding={canvasPadding}
                bgColor={canvasSettings.bgColor}
                zoomFactor={zoomFactor}
                panMode={panMode}
                onMounted={() => isEditorCanvasMounted = true}
                />
        </div>
        <div class="w-max m-[0_auto] relative" style={`padding: ${canvasPadding * zoomFactor}px`} class:hidden={activeView !== 'dither'} style:margin-top={'var(--editor-toolbar-height)'}>
            <CanvasSidesIndicator orientation={canvasSettings.orientation} padding={canvasPadding} zoomFactor={zoomFactor} />
            <div class="slider-container leading-0 border-transparent" style:border-width={'var(--editor-canvas-border)'}>
                <img-comparison-slider
                    bind:this={imgComparisonSlider}
                    style:width={actualWidth + 'px'}
                    style:height={actualHeight + 'px'}
                    style:--default-handle-width={Math.max(70, Math.min(0.2 * Math.max(actualWidth, actualHeight), 140)) + 'px'}
                    value={0}
                    handle="disabled"
                    keyboard="false">
                    <div slot="before" class="zoomable">
                        <PreviewCanvas bind:this={previewCanvas}
                            width={rotatedWidth}
                            height={rotatedHeight}
                            onMounted={() => isPreviewCanvasMounted = true}
                            palette={ditherPalette.palette}
                            devicePalette={ditherPalette.devicePalette}
                            paletteMap={ditherPalette.paletteMap}
                            blackColor={ditherPalette.blackColor}
                            whiteColor={ditherPalette.whiteColor}
                            activeView={activeView}
                            hidden={!!ditherSettings.devicePaletteId}
                            />
                        <DevicePreviewCanvas bind:this={devicePreviewCanvas}
                            width={rotatedWidth}
                            height={rotatedHeight}
                            palette={ditherPalette.palette}
                            devicePalette={ditherPalette.devicePalette}
                            previewCanvas={previewCanvas}
                            hidden={!ditherSettings.devicePaletteId}
                            />
                    </div>
                    <img slot="after" bind:this={beforeImg}
                        style:max-width='none'
                        class="zoomable"
                        style:width={rotatedWidth + 'px'}
                        style:height={rotatedHeight + 'px'}
                        />
                </img-comparison-slider>
            </div>
        </div>
    </div>
    <ViewportToolbar
        activeView={activeView}
        bind:panMode={panMode}
        bind:zoomFactor={zoomFactor}
        onCompare={pressed => imgComparisonSlider.value = pressed ? 100 : 0}
        />
</div>
