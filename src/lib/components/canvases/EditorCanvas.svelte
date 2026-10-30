<script lang="ts">
import { canvasHistoryManager } from "$lib/stores/managers.svelte";
import { Canvas, FabricObject, Path } from "fabric";
import { onMount } from "svelte";
import { enableTouchGestures, keepControlSizeOnZoom } from "$lib/editor/TouchGestures";

let {
    width,
    height,
    padding,
    bgColor = '#fff',
    zoomFactor,
    panMode,
    onMounted,
}: {
    width: number;
    height: number;
    padding: number;
    bgColor: string;
    zoomFactor: CanvasZoomFactor;
    panMode: boolean;
    onMounted: () => void;
} = $props();

let canvasElement: HTMLCanvasElement;
let fabricCanvas: Canvas;
let workspaceRect: Path;
let workspaceClipRect: Path;

let realWidth = $derived(width + padding * 2);
let realHeight = $derived(height + padding * 2);

export function clear() {
    const objects = fabricCanvas.getObjects();

    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        if (!(obj as any).isWorkspace) {
            fabricCanvas.remove(obj);
        }
    }

    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
}

function setupWorkspaceCanvas() {
    if (width < 1 || height < 1 || (fabricCanvas.getWidth() === realWidth && fabricCanvas.getHeight() === realHeight)) {
        return;
    }

    const left = Math.floor(width / 2);
    const top = Math.floor(height / 2);

    // Use Path() instead of Rect()
    // becase Rect() has anti-aliasing border
    if (workspaceRect) {
        fabricCanvas.remove(workspaceRect);
    }
    workspaceRect = new Path(`M 0 0 H ${width} V ${height} H 0 Z`, {
        fill: '#ffffff00',
        strokeWidth: 0,
        selectable: false,
        evented: false,
        isWorkspace: true,  // custom property
    });
    fabricCanvas.insertAt(0, workspaceRect);

    // Force all added objects to clip to the workspace, 
    // while controls remain visible outside it
    workspaceClipRect = new Path(`M 0 0 H ${width} V ${height} H 0 Z`, {
        strokeWidth: 0,
    });
    fabricCanvas.clipPath = workspaceClipRect;

    fabricCanvas.setDimensions({
        width: realWidth,
        height: realHeight,
    });
    canvasHistoryManager.initCanvas(fabricCanvas);

    workspaceRect.set({
        left: left,
        top: top,
        width: width,
        height: height,
    }).setCoords();

    workspaceClipRect.set({
        left: left,
        top: top,
        width: workspaceRect.width,
        height: workspaceRect.height,
    }).setCoords();

    fabricCanvas.requestRenderAll();

    // Same height as EditorToolbar
    const wrapperEl = fabricCanvas.wrapperEl;
    wrapperEl.classList.add('editor-canvas-container');
    wrapperEl.scrollIntoView({
        block: 'center',
        inline: 'center',
    });
}

onMount(() => {
    fabricCanvas = new Canvas(canvasElement, {
        enableRetinaScaling: false,
        imageSmoothingEnabled: false,
        controlsAboveOverlay: true,
        selection: false,  // disable marquee selection
    });

    // Pinch to scale / twist to rotate with two fingers (phones, tablets)
    const removeTouchGestures = enableTouchGestures(fabricCanvas);

    onMounted();

    return removeTouchGestures;
});

$effect(() => {
    setupWorkspaceCanvas();

    fabricCanvas.wrapperEl.dataset.panMode = panMode.toString();

    if (fabricCanvas.backgroundColor !== bgColor) {
        fabricCanvas.backgroundColor = bgColor;
        fabricCanvas.requestRenderAll();
    }

    fabricCanvas.setViewportTransform([1, 0, 0, 1, padding, padding]);
});

// Corner handles keep the same size on screen at every zoom level
$effect(() => {
    keepControlSizeOnZoom(fabricCanvas, FabricObject, zoomFactor);
});

export {
    fabricCanvas,
    width,
    height,
    realWidth,
    realHeight,
    padding,
}
</script>

<style>
@reference "tailwindcss";

:global(.editor-canvas-container) {
    border: var(--editor-canvas-border) solid color-mix(in oklab, var(--canvas-bg), rgb(255 255 255 / 15%));
}
</style>

<canvas bind:this={canvasElement} class="zoomable" width={width} height={height}></canvas>
