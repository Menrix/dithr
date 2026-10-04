<script module lang="ts">
const DEVICE_BEZEL_DEFAULT_PX = 1;
const DEVICE_BEZEL_RADIUS_DEFAULT_PX = 1;

const SIDES: Record<CanvasOrientation, Record<CanvasOrientation, CanvasOrientation>> = {
    top: {
        top: 'top',
        bottom: 'bottom',
        left: 'left',
        right: 'right',
    },
    bottom: {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left',
    },
    left: {
        top: 'left',
        bottom: 'right',
        left: 'bottom',
        right: 'top',
    },
    right: {
        top: 'right',
        bottom: 'left',
        left: 'top',
        right: 'bottom',
    },
};

const ROTATIONS = {
    top: '0deg',
    bottom: '180deg',
    left: '90deg',
    right: '-90deg',
}

export { deviceMockup };
</script>

<style>
@reference "tailwindcss";

/* Bug when not using :global() in Android app */
:global(.device-mockup) {
    @apply
        box-content border-solid rounded-xs border-white
        overflow-clip
        ;
    margin: 0 auto;
    border-color: color-mix(in oklch, var(--palette-base) 20%, white 30%);;
    background-color: color-mix(in oklch, var(--palette-base, #000) 20%, black 30%);
}
</style>

{#snippet deviceMockup(device: BaseDeviceInfo, deviceWidthPx: number, orientation: CanvasOrientation, previewImg?: string)}
    {@const factor = deviceWidthPx / 100}
    {@const bezels = device.bezels || {}}
    {@const rotated = orientation === 'left' || orientation === 'right'}
    <div class="device-mockup"
        style:aspect-ratio={rotated ? `${device.height}/${device.width}` : `${device.width}/${device.height}`}
        style:width={!rotated ? deviceWidthPx + 'px': ''}
        style:height={rotated ? deviceWidthPx + 'px': ''}
        style:border-top-width={(bezels[SIDES[orientation].top] ? bezels[SIDES[orientation].top]! * factor : DEVICE_BEZEL_DEFAULT_PX) + 'px'}
        style:border-bottom-width={(bezels[SIDES[orientation].bottom] ? bezels[SIDES[orientation].bottom]! * factor : DEVICE_BEZEL_DEFAULT_PX) + 'px'}
        style:border-left-width={(bezels[SIDES[orientation].left] ? bezels[SIDES[orientation].left]! * factor : DEVICE_BEZEL_DEFAULT_PX) + 'px'}
        style:border-right-width={(bezels[SIDES[orientation].right] ? bezels[SIDES[orientation].right]! * factor : DEVICE_BEZEL_DEFAULT_PX) + 'px'}
        style:border-radius={(bezels.radiusOutside ? bezels.radiusOutside * factor : DEVICE_BEZEL_RADIUS_DEFAULT_PX) + 'px'}
    >
        {#if previewImg}
            {@const isSvg = previewImg.endsWith('.svg')}
            {#if isSvg}
                <div class="w-full h-full p-0.5" style:rotate={ROTATIONS[orientation]}>
                    <img src={previewImg} class="w-full h-full object-contain p-0.5" />
                </div>
            {:else}
                <img src={previewImg} />
            {/if}
        {/if}
    </div>
{/snippet}
