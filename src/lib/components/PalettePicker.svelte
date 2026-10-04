<script lang="ts">
import { FULL_COLOR_PALETTE, getDevicePalette, getPalette, PALETTE_ORDERS, PALETTES } from "$lib/palettes";
import ArrowUpRightIcon from "phosphor-svelte/lib/ArrowUpRightIcon";
import { paletteBlock } from "./snippets/PaletteBlock.svelte";
import CheckboxInput from "./settings/CheckboxInput.svelte";

let {
    sourcePaletteId,
    sourceDevicePaletteId,
    paletteId = $bindable(FULL_COLOR_PALETTE),
    devicePaletteId = $bindable(),
    limitedPaletteId = '',
    onchange,
}: {
    sourcePaletteId: PaletteId;
    sourceDevicePaletteId: string | undefined;
    paletteId: PaletteId;
    devicePaletteId: string | undefined;
    limitedPaletteId?: string;
    onchange?: () => void;
} = $props();

let paletteInfo = $derived(getPalette(paletteId));
let devicePaleteInfo = $derived(getDevicePalette(paletteId, devicePaletteId))

// svelte-ignore non_reactive_update
let paletteList: HTMLDivElement;
// svelte-ignore state_referenced_locally
let showDevicePalettes = $state(false);

function onSelected(e: Event) {
    const target = e.currentTarget as HTMLElement;
    paletteId = target.dataset.palette as PaletteId;
    devicePaletteId = target.dataset.device as PaletteId;

    onchange && onchange();
}
</script>

<style>
@reference "tailwindcss";

.btn {
    @apply
        w-full
        relative
        p-0 overflow-visible
        border-2 border-white
        outline-2 outline-offset-0 outline-black
        isolate
        bg-transparent
        zoom-110
        ;
    &:focus {
        translate: 0;
    }

    &::after {
        @apply absolute block -top-1 -left-1 -right-1 -bottom-1.5;
        content: '';
        border: 2px solid black;
        border-bottom-width: 4px;
    }

    :global(.grid) {
        @apply border-0;
    }
}

.dropdown-content {
    @apply
        m-0 mt-1
        w-full max-h-80
        overflow-auto scrollbar-thin overscroll-none
        bg-[#1f1f1f]
        shadow-xl/30
        ;
}
</style>

<div class="dropdown">
    <div
        tabindex="-1"
        role="button"
        class="btn btn-primary"
        // @ts-expect-error
        onfocus={() => paletteList.querySelector('.active')?.scrollIntoView({ block: 'center', inline: 'nearest', container: 'nearest' })}
        >
        {#if devicePaleteInfo}
            {@render paletteBlock(devicePaleteInfo.name, devicePaleteInfo.colors , false, paletteId === sourcePaletteId && devicePaletteId === sourceDevicePaletteId)}
        {:else}
            {@render paletteBlock(paletteInfo.name, paletteInfo.colors)}
        {/if}
    </div>

    <div class="relative top-1 -right-0.75 text-right m-0 p-0 flex flex-row-reverse">
        <span class="bg-black text-white text-[12px] px-2 inline-block h-full" class:invisible={!paletteInfo.author}>
            <a href={'url' in paletteInfo ? paletteInfo.url as string : undefined} target="_blank" rel="nofollow noreferer noopener">
                {#if devicePaleteInfo}
                    <b>{paletteInfo.name}</b>
                    by
                {/if}
                {#if paletteInfo.author}
                    <b>{paletteInfo.author}</b>
                {:else}
                    <b>&nbsp;</b>
                {/if}

                {#if 'url' in paletteInfo}
                    <ArrowUpRightIcon class="inline-block" color="currentColor" size={12} />
                {/if}
            </a>
        </span>
    </div>

    <div
        bind:this={paletteList}
        tabindex="-1"
        class="dropdown-content"
        >
        <ul class="menu flex gap-3 w-full p-4">
            {#if !limitedPaletteId}
                <li>
                    <CheckboxInput
                        label="Show device palettes"
                        bind:checked={showDevicePalettes}
                        onchange={v => {}}
                        />
                </li>
            {/if}
            {#each Object.entries(PALETTE_ORDERS) as [group, paletteIds]}
                {#if !limitedPaletteId}
                    <li class="font-bold text-lg mt-2">{group}</li>
                {/if}
                {#each paletteIds as pId}
                    {#if !limitedPaletteId || limitedPaletteId === pId}
                        {@const info = PALETTES[pId]}
                        {@const devicePalettes = ('devicePalettes' in PALETTES[pId] ? PALETTES[pId]['devicePalettes'] : {}) as PaletteInfo['devicePalettes']}
                        <li data-palette={pId} class="relative h-8" onclick={onSelected}>
                            {@render paletteBlock(info.name, info.colors, pId === paletteId && !devicePaletteId)}
                        </li>
                        <!-- Device palette -->
                        {#if limitedPaletteId || showDevicePalettes}
                            {#each Object.entries(devicePalettes) as [dId, info], index}
                                {#if index === 0}
                                    <li class="text-[10px] font-bold ml-5">Device palette</li>
                                {/if}
                                <li data-palette={pId} data-device={dId} class="relative ml-5 h-8" onclick={onSelected}>
                                    {@render paletteBlock(info.name, info.colors, pId === paletteId && dId === devicePaletteId, pId === sourcePaletteId && dId === sourceDevicePaletteId)}
                                </li>
                            {/each}
                        {/if}
                    {/if}
                {/each}
            {/each}
        </ul>
    </div>
</div>
