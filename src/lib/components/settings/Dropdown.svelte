<script lang="ts">
import { blurActive } from "$lib/utils";

let {
    label,
    value = $bindable(),
    options,
    class: className,
    onchange,
    disabled,
    visible,
    gap = 2,
    autoClose = true,
}: {
    label?: string;
    value: string;
    options: Record<string, string>;
    class?: string;
    onchange?: (value: string) => void;
    disabled?: boolean | (() => boolean);
    visible?: boolean | (() => boolean);
    gap?: number;
    autoClose?: boolean;
} = $props();

let isDisabled = $derived(typeof disabled === 'boolean' ? disabled : disabled ? disabled() : false);
let isVisible = $derived(typeof visible === 'boolean' ? visible : visible ? visible() : true);
</script>

<style>
@reference "tailwindcss";
</style>

<div class={gap ? `grid gap-${gap}` : ''} class:hidden={!isVisible}>
    {#if label}
        <div class="setting-label flex-1">{label}</div>
    {/if}
    <div class={'w-full dropdown dithr-dropdown ' + (className ?? '')}>
        <div class="btn w-full" role="button" tabindex="-1" aria-disabled={isDisabled}>
            {options[value]}
        </div>

        <div tabindex="-1" class="m-0 mt-1 dropdown-content w-full max-h-80 overflow-auto bg-[#1f1f1f] scrollbar-thin shadow-xl/30 border-2 border-white overscroll-none">
            <ul class="menu flex gap-3 w-full p-4">
                {#each Object.entries(options) as [rawName, name]}
                    <li onclick={() => { value = rawName; onchange?.(value); autoClose && blurActive(); }} class:menu-active={rawName === value}>
                        <a>{name}</a>
                    </li>
                {/each}
            </ul>
        </div>
    </div>
</div>
