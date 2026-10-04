<script lang="ts">
import EyeSlashIcon from 'phosphor-svelte/lib/EyeSlashIcon';

let {
    paletteId,
    devicePalette,
    value = $bindable([]),
    onchange,
}: {
    paletteId: PaletteId;
    devicePalette: PaletteRgb;
    value: number[];
    onchange: (map: number[]) => void;
} = $props();

function toggleColor(e: Event, index: number) {
    let changed = false;
    if (value[index] === -1) {
        // Turn on
        value[index] = 0;
        changed = true;
    } else {
        // Count number of colors
        const count = value.reduce((acc, val) => acc += val !== -1 ? 1 : 0, 0);
        // Turn off if current colors are > 2 (limit min colors to 2)
        if (count > 2) {
            value[index] = -1;
            changed = true;
        }
    }

    if (!changed) {
        e.preventDefault();
        return;
    }

    onchange(value);
}

let colorCount = $derived(devicePalette.length);
let colorRows = $derived(Math.ceil(colorCount / 5));
</script>

<style>
@reference 'tailwindcss';

.color-block {
    --block-height: 30px;

    width: 100%;
    height: var(--block-height);
}
</style>

<div class="collapse collapse-arrow border-2 bg-[#303030] border-black mt-2" class:hidden={devicePalette.length <= 2}>
    <input type="checkbox" />
    <div class="collapse-title font-semibold px-4 py-2 text-white">Customize</div>
    {#key paletteId}
        <div class="collapse-content text-sm">
            <div class="grid grid-flow-col auto-cols-auto w-full border-2 border-white" style:grid-template-rows={`repeat(${colorRows}, minmax(0, 1fr))`}>
                {#each devicePalette as color, index}
                    <label class="swap inline-grid grid-cols-1">
                        <input onclick={(e) => toggleColor(e, index)} type="checkbox" />
                        <div class="swap-on color-block isolate relative flex items-center">
                            <EyeSlashIcon class="z-10 flex-1 mix-blend-difference" size={20} color="white" />
                            <div class="absolute inset-0 w-full h-full filter-[grayscale(0.5)]" style:background-color={`rgba(${color.join(',')}, 40%)`}></div>
                        </div>
                        <div class="swap-off color-block" style:background-color={`rgb(${color.join(',')})`}></div>
                    </label>
                {/each}
            </div>
        </div>
    {/key}
</div>
