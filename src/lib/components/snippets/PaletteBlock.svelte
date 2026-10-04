<script module lang="ts">
export { paletteBlock };
</script>

<style>
@reference "tailwindcss";

:global(.active) {
    @apply border-2 border-white;
}
</style>

{#snippet paletteBlock(name: string, colors: PaletteRgb, active: boolean = false, isDefault: boolean = false)}
    <div class="absolute inset-0 flex hover:bg-[#93939357]">
        <p class="flex-1 self-center text-white text-stroke justify-center p-0">
            {#if isDefault}
                {name} ✱
            {:else}
                {name}
            {/if}
        </p>
    </div>
    <div class="grid grid-rows-1 grid-flow-col auto-cols-auto gap-0 p-0 w-full border-2 border-transparent h-full" class:active={active}>
        {#each colors as color, index}
            <div class="h-full" style:background-color={`rgb(${color.join(',')})`}></div>
        {/each}
    </div>
{/snippet}
