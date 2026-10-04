<script lang="ts">
import CheckIcon from "phosphor-svelte/lib/CheckIcon";
import MinusIcon from "phosphor-svelte/lib/MinusIcon";
import PlusIcon from "phosphor-svelte/lib/PlusIcon";
import HandIcon from "phosphor-svelte/lib/HandIcon";
import SquareHalfIcon from "phosphor-svelte/lib/SquareHalfIcon";
import HandGrabbingIcon from "phosphor-svelte/lib/HandGrabbingIcon";
	import { blurActive } from "$lib/utils";

let {
    activeView,
    panMode = $bindable(false),
    zoomFactor = $bindable(1),
    onCompare,
}: {
    activeView: EditorView;
    panMode: boolean;
    zoomFactor: CanvasZoomFactor;
    onCompare: (pressed: boolean) => void;
} = $props();

const ZOOM_FACTORS: CanvasZoomFactor[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 5];
let isComparing = $state(false);

function zoomTo(factor: CanvasZoomFactor) {
    zoomFactor = factor;
    blurActive();
}

function zoomIn() {
    const index = ZOOM_FACTORS.indexOf(zoomFactor);
    if (index === -1) {
        zoomFactor = 1;
        return;
    }

    zoomFactor = ZOOM_FACTORS[Math.min(index + 1, ZOOM_FACTORS.length - 1)];
}

function zoomOut() {
    const index = ZOOM_FACTORS.indexOf(zoomFactor);
    if (index === -1) {
        zoomFactor = 1;
        return;
    }

    zoomFactor = ZOOM_FACTORS[Math.max(0, index - 1)];
}
</script>

<style>
@reference "tailwindcss";

.viewport-toolbar {
    .btn-disabled {
        opacity: 0.5;
        background-color: rgb(173, 173, 173);
    }
}
</style>

<div class="viewport-toolbar absolute bottom-4 right-4 z-100 select-none flex">
    <div class="flex items-center gap-2">
        <label class="swap rounded-sm border-2 border-black shadow-black" class:hidden={window.navigator.maxTouchPoints === 0 || activeView !== 'canvas'}>
            <input type="checkbox" bind:checked={panMode} />
            <button class="dithr-btn btn-sm btn-square swap-off pointer-events-none" aria-label="Pan mode: disabled">
                <HandIcon color="currentColor" size={16} />
            </button>
            <button class="dithr-btn btn-sm btn-square btn-active btn-warning swap-on pointer-events-none" aria-label="Pan mode: enabled">
                <HandGrabbingIcon color="currentColor" size={16} />
            </button>
        </label>

        <button
            onpointerdown={() => { isComparing = true; onCompare(true); }}
            onpointerup={() => { isComparing = false; onCompare(false); }}
            class="dithr-btn btn-sm btn-soft btn-square swap-on"
            class:btn-warning={isComparing}
            class:hidden={activeView !== 'dither'}
            title="Compare"
            >
            <SquareHalfIcon color="currentColor" weight="bold" size={16} />
        </button>

        <!-- additional space-->
        <div></div>

        <button onclick={() => zoomOut()} class="dithr-btn btn-sm btn-soft btn-square swap-on" class:btn-disabled={zoomFactor === ZOOM_FACTORS[0]} title="Zoom out">
            <MinusIcon color="currentColor" weight="bold" size={16} />
        </button>

        <div class="dropdown dropdown-top dropdown-center flex">
            <div tabindex="-1" role="button" class="dithr-btn btn-sm whitespace-pre w-10">{zoomFactor * 100}%</div>
            <ul tabindex="-1" class="dropdown-content menu rounded-box z-1 w-27.5 mb-0.75 p-0 shadow-sm flex-col-reverse bg-[#111111]">
                {#each ZOOM_FACTORS as factor}
                    <li>
                        <a onclick={() => zoomTo(factor)}>
                            {factor * 100}%
                            {#if factor === zoomFactor}
                                <CheckIcon color="currentColor" size={12} />
                            {:else if factor == 1}
                                ✱
                            {/if}
                        </a>
                    </li>
                {/each}
            </ul>
        </div>

        <button onclick={() => zoomIn()} class="dithr-btn btn-sm btn-soft btn-square swap-off" class:btn-disabled={zoomFactor === ZOOM_FACTORS[ZOOM_FACTORS.length - 1]} title="Zoom in">
            <PlusIcon color="currentColor" weight="bold" size={16} />
        </button>
    </div>
</div>
