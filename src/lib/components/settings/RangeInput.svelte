<script lang="ts">
import TouchRange from "./TouchRange.svelte";
import ArrowCounterClockwiseIcon from 'phosphor-svelte/lib/ArrowCounterClockwiseIcon';
import { clamp, isFloat } from "$lib/utils";
import { onDestroy, onMount } from "svelte";

let {
    label,
    defaultValue,
    value = $bindable(defaultValue),
    min,
    max,
    step,
    oninput,
    oncommit,
    unit,
    minDecimal = 0,
    textMultiply = 1,
    disabled,
    visible,
    coloredState = true,
    class: className,
    showReset = true,
    simple = false,
}: {
    label: string;
    defaultValue?: number;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    minDecimal?: number;
    oninput?: (value: number) => void,
    oncommit?: (value: any) => void;
    textMultiply?: number;
    disabled?: boolean | (() => boolean);
    visible?: boolean | (() => boolean);
    coloredState?: boolean;
    class?: string | undefined;
    showReset?: boolean;
    simple?: boolean;
} = $props();

let input: HTMLInputElement;
let isEditing = false;
let lastValue: string;

let isDisabled = $derived(typeof disabled === 'boolean' ? disabled : disabled ? disabled() : false);
let isVisible = $derived(typeof visible === 'boolean' ? visible : visible ? visible() : true);

function updateTextValue(v: number) {
    if (isEditing) {
        return;
    }

    let tmp = textMultiply !== 1 ? Math.round(v * textMultiply) : v;
    let text = tmp.toFixed(minDecimal);

    input.value = text;
}

function reset() {
    value = typeof defaultValue !== 'undefined' ? defaultValue : min;
    onRangeInput(value);
}

function onInput(v: string) {
    let tmpValue: number;

    if (isFloat(step)) {
        tmpValue = parseFloat(v) / textMultiply;
    } else {
        tmpValue = parseInt(v) / textMultiply;
    }

    if (typeof tmpValue === 'undefined' || isNaN(tmpValue)) {
        tmpValue = defaultValue || min;
    }

    tmpValue = clamp(tmpValue, min, max);
    value = tmpValue!;
    oninput?.(value);
}

function onRangeInput(value: number) {
    updateTextValue(value);
    oninput?.(value);
}

function onKeyDown(e: KeyboardEvent) {
    const key = e.key;

    if (key === 'Enter') {
        // Enter = blur input
        oncommit?.(value);
        input.blur();
    } else if (key === 'Escape') {
        // Escape = restore back to the previous value
        onInput(lastValue);
        input.blur();
    }
}

function onFocus(e: Event) {
    isEditing = true;
    lastValue = input.value;
    input.parentElement!.classList.add('tooltip', 'tooltip-open');
}

function onBlur(e: Event) {
    isEditing = false;
    updateTextValue(value);
    input.parentElement!.classList.remove('tooltip', 'tooltip-open');
}

onMount(() => {
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);

    updateTextValue(defaultValue ?? min);
});

$effect(() => {
    updateTextValue(value);
});

onDestroy(() => {
    input.removeEventListener('focus', onFocus);
    input.removeEventListener('blue', onBlur);
});

export {
    min,
    max,
}
</script>

<style>
@reference "tailwindcss";

.input-wrapper {
    @apply
        flex items-center
        pr-1
        rounded
        text-[11px]
        transition-colors
        ;
    .input {
        @apply
            text-[11px]
            bg-transparent
            border-none
            px-0
            w-10 h-5
            ;

        &:focus {
            @apply border-none outline-none;
        }
    }

    &:not([data-disabled="true"]) {
        &:hover {
            background-color: rgb(53, 53, 53);
        }

        &:focus-within {
            background-color: black;
        }
    }
}

.wrapper {
    @apply transition-opacity;

    &[data-disabled="true"] {
        @apply pointer-events-none opacity-40;
    }

    &[data-simple="true"] {
        @apply grid grid-cols-[1fr_min-content] gap-2 items-end;

        .input-wrapper {
            @apply pb-0;
        }

        > *:first-child {
            order: 2;
        }

        > *:nth-child(2) {
            order: 1;
        }
    }
}

:global(.tooltip) {
    :global(&[data-tip]:before) {
        font-size: 11px;
    }
}
</style>

<div class={'wrapper ' + (className ?? '')} data-disabled={isDisabled} class:hidden={!isVisible} data-simple={simple}>
    <div class="flex h-6 items-center gap-x-1" class:pb-1={!simple} class:-mb-1={simple}>
        <div class="setting-label flex-1">{label}</div>
        {#if showReset && typeof defaultValue !== 'undefined'}
            <button
                class="btn btn-sm btn-ghost btn-square p-0! align-middle px-1"
                aria-label="Reset"
                class:hidden={value === defaultValue}
                onclick={reset}
                >
                <ArrowCounterClockwiseIcon color="currentColor" size={12} />
            </button>
        {/if}
        <div class="input-wrapper tooltip-info tooltip-top tooltip-end cursor-text" data-tip={`${(min * textMultiply).toFixed(minDecimal)} … ${(max * textMultiply).toFixed(minDecimal)}`} onclick={() => input.focus()}>
            <input
                bind:this={input}
                type="number"
                min={min * textMultiply}
                max={max * textMultiply}
                step={step * textMultiply}
                class="input text-right"
                oninput={() => onInput(input.value)}
                onwheel={() => input.blur()}
                onkeydown={onKeyDown}
                disabled={false}
                />
            {#if unit}
                <span>{unit}</span>
            {/if}
        </div>
    </div>
    <TouchRange
        bind:value={value}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step}
        disabled={false}
        oninput={() => onRangeInput(value)}
        onchange={() => oncommit?.(value)}
        coloredState={coloredState}
    />
</div>
