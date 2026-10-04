<script lang="ts">
let {
    orientation,
    padding,
    zoomFactor,
}: {
    orientation: CanvasOrientation,
    padding: number,
    zoomFactor: CanvasZoomFactor,
} = $props();

const SIDE_PADDING = 25;

const SIDE_LABELS: Record<CanvasOrientation, [string, string]> = {
    'top': ['Top', 'Bottom'],
    'bottom': ['Bottom', 'Top'],
    'left': ['Left', 'Right'],
    'right': ['Right', 'Left'],
};
</script>

<style>
@reference "tailwindcss";

.canvas-side {
    @apply
        absolute left-0 right-0 z-10
        m-[0_auto]
        opacity-40
        rounded-2xl
        transition-opacity
        select-none
        ;
}
</style>

<div class="absolute inset-0 pointer-events-none"
    style:top={`calc(${padding * zoomFactor}px - ${SIDE_PADDING}px - 2px)`}
    style:bottom={`calc(${padding * zoomFactor}px - ${SIDE_PADDING}px)`}
    class:hidden={orientation === 'top'}
>
    <div class="canvas-side top-0 badge badge-neutral badge-xs">{SIDE_LABELS[orientation][0]} side</div>
    <div class="hidden canvas-side bottom-0 badge badge-neutral badge-xs">{SIDE_LABELS[orientation][1]} side</div>
</div>
