<script lang="ts">
import { FabricObject, type Canvas } from "fabric";
import EditorCanvas from "../canvases/EditorCanvas.svelte";
import AlignLeftIcon from "phosphor-svelte/lib/AlignLeftIcon";
import AlignRightIcon from "phosphor-svelte/lib/AlignRightIcon";
import AlignTopIcon from "phosphor-svelte/lib/AlignTopIcon";
import AlignBottomIcon from "phosphor-svelte/lib/AlignBottomIcon";
import AlignCenterHorizontalIcon from "phosphor-svelte/lib/AlignCenterHorizontalIcon";
import AlignCenterVerticalIcon from "phosphor-svelte/lib/AlignCenterVerticalIcon";
import ResizeIcon from "phosphor-svelte/lib/ResizeIcon";
import ArrowsHorizontalIcon from "phosphor-svelte/lib/ArrowsHorizontalIcon";
import ArrowsVerticalIcon from "phosphor-svelte/lib/ArrowsVerticalIcon";
import { type ObjectAlignment, type ObjectScaleType } from "$lib/editor/LayerManager";
import ArrowUUpLeftIcon from 'phosphor-svelte/lib/ArrowUUpLeftIcon';
import ArrowUUpRightIcon from 'phosphor-svelte/lib/ArrowUUpRightIcon';
import { canvasHistoryManager } from "$lib/stores/managers.svelte";
import { onDestroy, onMount } from "svelte";

let {
    activeView,
}: {
    activeView: EditorView;
} = $props();

let fabricCanvas: Canvas;
let selectedObject: FabricObject | undefined = $state(undefined);
let unsubscribe: () => void;
let canUndo = $state(false);
let canRedo = $state(false);

let editorCanvas: EditorCanvas;

const ICON_SIZE = 20;

function refresh() {
    canUndo = canvasHistoryManager.canUndo();
    canRedo = canvasHistoryManager.canRedo();
}


export function initialize(editor: EditorCanvas) {
    editorCanvas = editor;    

    fabricCanvas = editorCanvas.fabricCanvas;
    fabricCanvas.on('selection:created', e => {
        selectedObject = e.selected[0];
    });

    fabricCanvas.on('selection:updated', e => {
        selectedObject = e.selected[0];
    });

    fabricCanvas.on('selection:cleared', e => {
        selectedObject = undefined;
    });
}

function alignObjects(alignment: ObjectAlignment) {
    canvasHistoryManager?.alignObjects([alignment]);
}

function scaleObjects(type: ObjectScaleType) {
    canvasHistoryManager?.scaleObjects(type);
}

onMount(() => {
    unsubscribe = canvasHistoryManager.subscribe(refresh);
    refresh();
});

onDestroy(() => {
    unsubscribe?.();
});
</script>

<style>
@reference 'tailwindcss';

.dropdown {
    &:focus-within {
        .menu {
            display: grid;
        }
    }

    .dropdown-content {
        .menu {
            @apply p-1;
        }
    }
}
</style>

<div class="absolute z-10 w-full p-2 bg-[#363636] select-none flex gap-3 border-b-2 border-black" style:height='var(--editor-toolbar-height)' class:hidden={activeView !== 'canvas'}>
    <div class="flex-1">
        <div class="dropdown" class:hidden={!selectedObject}>
            <div tabindex="-1" role="button" class="dithr-btn btn-sm btn-square">
                <AlignLeftIcon color="#fff" size={ICON_SIZE} />
            </div>

            <div tabindex="-1" class="dropdown-content mt-1">
                <p class="text-xs text-center p-2">Alignment</p>
                <ul class="menu grid grid-cols-[min-content_min-content_min-content] gap-3">
                    <li class="col-span-3">
                        <button onclick={() => alignObjects('v-top')} class="dithr-btn btn-sm" aria-label="Align vertically: Top">
                            <AlignTopIcon color="#fff" size={ICON_SIZE} />
                        </button>
                    </li>
                    <li class="row-span-2">
                        <button onclick={() => alignObjects('h-left')} class="dithr-btn btn-square btn-sm h-full!" aria-label="Align horizontally: Left">
                            <AlignLeftIcon color="#fff" size={ICON_SIZE} />
                        </button>
                    </li>

                    <li>
                        <button onclick={() => alignObjects('h-center')} class="dithr-btn btn-square btn-sm" aria-label="Align horizontally: Center">
                            <AlignCenterHorizontalIcon color="#fff" size={ICON_SIZE} />
                        </button>
                    </li>

                    <li class="row-span-2">
                        <button onclick={() => alignObjects('h-right')} class="dithr-btn btn-square btn-sm h-full!" aria-label="Align horizontally: Right">
                            <AlignRightIcon color="#fff" size={ICON_SIZE} />
                        </button>
                    </li>

                    <li>
                        <button onclick={() => alignObjects('v-middle')} class="dithr-btn btn-square btn-sm" aria-label="Align vertically: Middle">
                            <AlignCenterVerticalIcon color="#fff" size={ICON_SIZE} />
                        </button>
                    </li>

                    <li class="col-span-3">
                        <button onclick={() => alignObjects('v-bottom')} class="dithr-btn btn-sm" aria-label="Align vertically: Bottom">
                            <AlignBottomIcon color="#fff" size={ICON_SIZE} />
                        </button>
                    </li>
                </ul>
            </div>
        </div>

        <div class="dropdown" class:hidden={!selectedObject}>
            <div tabindex="-1" role="button" class="dithr-btn btn-sm btn-square">
                <ResizeIcon color="#fff" size={ICON_SIZE} />
            </div>
            <div tabindex="-1" class="dropdown-content mt-1">
                <p class="text-xs text-center p-2">Resize</p>
                <ul tabindex="-1" class="menu flex! flex-row flex-nowrap gap-3">
                    <li class="flex-1">
                        <button onclick={() => scaleObjects('fit-width')} class="dithr-btn btn-square btn-sm" aria-label="Fit to width">
                            <ArrowsHorizontalIcon color="#fff" size={ICON_SIZE} />
                        </button>
                    </li>

                    <li class="flex-1">
                        <button onclick={() => scaleObjects('fit-height')} class="dithr-btn btn-square btn-sm" aria-label="Fit to height">
                            <ArrowsVerticalIcon color="#fff" size={ICON_SIZE} />
                        </button>
                    </li>

                    {#if selectedObject?.layerKind !== 'frame'}
                        <li class="flex-1">
                            <button onclick={() => scaleObjects('original-size')} class="dithr-btn btn-square btn-sm" aria-label="Full size">
                                1:1
                            </button>
                        </li>
                    {/if}
                </ul>
            </div>
        </div>
    </div>

    <div>
        <button class="dithr-btn btn-sm px-2" disabled={!canUndo} onclick={() => canvasHistoryManager.undo()}>
            <ArrowUUpLeftIcon size={16} color="currentColor" />
        </button>

        <button class="dithr-btn btn-sm px-2" disabled={!canRedo} onclick={() => canvasHistoryManager.redo()}>
            <ArrowUUpRightIcon size={16} color="currentColor" />
        </button>
    </div>
</div>
