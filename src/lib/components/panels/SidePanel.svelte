<script lang="ts">
import CanvasPanel from './CanvasPanel.svelte';
import type { Device } from '$lib/devices/Device';
import CanvasSidePanel from './CanvasSidePanel.svelte';
import Footer from '../Footer.svelte';
import DitherSidePanel from './DitherSidePanel.svelte';


let {
    activeView,
    canvasPanel,
    canvasPadding,
    targetDevice,
}: {
    activeView: EditorView;
    canvasPanel: CanvasPanel;
    canvasPadding: number;
    targetDevice: Device;
} = $props();

let isCustomDevice = $derived(targetDevice.deviceInfo.id === 'custom');
</script>

<style>
@reference 'tailwindcss';

.side-panel-container {
    @apply relative overflow-auto;

    .color-picker-portal {
        @apply absolute inset-0 z-10 hidden overflow-auto;
        :global(&:has(.is-open)) {
            @apply flex items-center justify-center z-20 backdrop-blur-xs;
            background-color: #00000069;
            height: clamp(360px, 100%, 100%);
        }
    }
}

.side-panel {
    @apply
        select-none
        relative overflow-auto scrollbar-thin
        h-[40dvh] sm:w-xs sm:h-full
        max-sm:border-t-2 sm:border-l-2 border-black
        grid grid-rows-[1fr_min-content]
        ;

    background-color: var(--content-bg);

    > div {
        grid-area: 1 / 1;
    }
}
</style>

<div class="side-panel-container">
    <div class="color-picker-portal"></div>
    <div class="side-panel">
        <div class="sm:w-full sm:h-full">
            <!-- CANVAS -->
            <CanvasSidePanel
                {activeView}
                {isCustomDevice}
                {targetDevice}
                {canvasPanel}
                />

            <!-- DITHER-->
            <DitherSidePanel
                {activeView}
                {isCustomDevice}
                {targetDevice}
                {canvasPanel}
                />
        </div>
        <Footer />
    </div>
</div>
