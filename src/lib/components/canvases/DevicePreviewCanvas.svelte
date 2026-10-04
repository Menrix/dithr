<script lang="ts">
import { PaletteSwappingFilter } from "$lib/filters/PaletteSwappingFilter";
import { FabricImage, StaticCanvas } from "fabric";
import { onMount } from "svelte";
import PreviewCanvas from "./PreviewCanvas.svelte";

let {
    width,
    height,
    previewCanvas,
    palette,
    devicePalette,
    hidden = false,
}: {
    width: number;
    height: number;
    previewCanvas: PreviewCanvas;
    palette: PaletteRgb,
    devicePalette: PaletteRgb,
    hidden?: boolean;
} = $props();

let canvasElement: HTMLCanvasElement;
let fabricCanvas: StaticCanvas;
let previewImage: FabricImage;
let hasImageData = $state(false);

const FILTERS: {
    paletteSwapping: null | PaletteSwappingFilter;
} = {
    paletteSwapping: null,
};

export function refreshPalette(rerender: boolean = false) {
    const rawPalette = $state.snapshot(palette);
    const rawDevicePalette = $state.snapshot(devicePalette);

    FILTERS.paletteSwapping?.updatePalette(rawPalette, rawDevicePalette);

    if (hasImageData) {
        previewImage?.applyFilters();
        if (rerender) {
            fabricCanvas?.requestRenderAll();
        }
    }
}

onMount(() => {
    fabricCanvas = new StaticCanvas(canvasElement, {
        enableRetinaScaling: false,
        imageSmoothingEnabled: false,
    });

    FILTERS.paletteSwapping = new PaletteSwappingFilter({
        palette,
        devicePalette,
    });

    previewImage = new FabricImage('');
    previewImage.filters.push(FILTERS.paletteSwapping!);

    fabricCanvas.add(previewImage);
    fabricCanvas.centerObject(previewImage);

    let isSyncing = false;
    previewCanvas.fabricCanvas.on('after:render', () => {
        if (isSyncing) {
            return;
        }

        if (hidden) {
            return;
        }

        isSyncing = true;
        hasImageData = true;
        const staticCanvasElement = previewCanvas.fabricCanvas.toCanvasElement();
        previewImage.setElement(staticCanvasElement);
        fabricCanvas.requestRenderAll();
        isSyncing = false;
    });
});

$effect(() => {
    if (!fabricCanvas) {
        return;
    }

    fabricCanvas.setDimensions({
        width,
        height,
    });
    fabricCanvas.centerObject(previewImage);
});

export {
    canvasElement as canvas,
    fabricCanvas,
}
</script>

<style>
canvas {
    background-color: white;
}
</style>

<canvas
    bind:this={canvasElement}
    class:hidden={hidden}
    width={width}
    height={height}
    ></canvas>
